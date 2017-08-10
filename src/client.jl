const SHUTDOWN = ("closed", "closing")


"""
    Client

Client that can be interacted with to submit computations to the scheduler and gather
results. Should only be used directly for advanced workflows. See [`DaskExecutor`](@ref)
instead for normal usage.

# Fields
- `nodes::Dict{String, DispatchNode}`: maps keys to their dispatcher `DispatchNode`
- `id::String`: this client's identifier
- `status::String`: status of this client
- `scheduler_address::Address`: the dask-distributed scheduler ip address and port info
- ` scheduler::Rpc`: manager for discrete send/receive open connections to the scheduler
- `connecting_to_scheduler::Bool`: if client is currently trying to connect to the scheduler
- `scheduler_comm::Nullable{BatchedSend}`: batched stream for communication with scheduler
- `pending_msg_buffer::Array`: pending msgs to send on the batched stream
"""
type Client
    nodes::Dict{Array{UInt8, 1}, Void}
    id::String
    status::String
    scheduler_address::Address
    scheduler::Rpc
    connecting_to_scheduler::Bool
    scheduler_comm::Nullable{BatchedSend}
    pending_msg_buffer::Array{Dict, 1}
end

"""
    Client(scheduler_address::String) -> Client

Construct a `Client` which can then be used to submit computations or gather results from
the dask-scheduler process.


## Usage

```julia
using DaskDistributedDispatcher
using Dispatcher

addprocs(3)
@everywhere using DaskDistributedDispatcher

for i in 1:3
    @spawn Worker("127.0.0.1:8786")
end

client = Client("127.0.0.1:8786")

op = Op(Int, 2.0)
submit(client, op)
result = fetch(op)
```

Previously submitted `Ops` can be cancelled by calling:

```julia
cancel(client, [op])

# Or if using the `DaskExecutor`
cancel(executor.client, [op])
```

If needed, which worker(s) to run the computations on can be explicitly specified by
returning the worker's address when starting a new worker:

```julia
using DaskDistributedDispatcher
client = Client("127.0.0.1:8786")

pnums = addprocs(1)
@everywhere using DaskDistributedDispatcher

worker_address = @fetchfrom pnums[1] begin
    worker = Worker("127.0.0.1:8786")
    return worker.address
end

op = Op(Int, 1.0)
submit(client, op, workers=[worker_address])
result = result(client, op)
```
"""
function Client(scheduler_address::String)
    scheduler_address = Address(scheduler_address)

    client = Client(
        Dict{Array{UInt8, 1}, DispatchNode}(),
        "$(Base.Random.uuid1())",
        "connecting",
        scheduler_address,
        Rpc(scheduler_address),
        false,
        nothing,
        Dict[],
    )
    ensure_connected(client)
    return client
end

"""
    ensure_connected(client::Client)

Ensure the `client` is connected to the dask-scheduler. For internal use.
"""
function ensure_connected(client::Client)
    @async begin
        if (
            (isnull(client.scheduler_comm) || !isopen(get(client.scheduler_comm).comm)) &&
            !client.connecting_to_scheduler
        )
            client.connecting_to_scheduler = true
            comm = connect(client.scheduler_address)
            response = send_recv(
                comm,
                Dict("op" => "register-client", "client" => client.id, "reply"=> false)
            )

            get(response, "op", nothing) == "stream-start" || error("Error: $response")


            client.scheduler_comm = BatchedSend(comm, interval=0.01)
            client.connecting_to_scheduler = false

            client.status = "running"

            while !isempty(client.pending_msg_buffer)
                send_msg(get(client.scheduler_comm), pop!(client.pending_msg_buffer))
            end
        end
    end
end

"""
    send_to_scheduler(client::Client, msg::Dict{String, Message})

Send `msg` to the dask-scheduler that the client is connected to. For internal use.
"""
function send_to_scheduler(client::Client, msg::Dict{String, Message})
    if client.status == "running"
        send_msg(get(client.scheduler_comm), msg)
    elseif client.status == "connecting"
        push!(client.pending_msg_buffer, msg)
    else
        error("Client not running. Status: \"$(client.status)\"")
    end
end

"""
    submit(client::Client, node::DispatchNode; workers::Array{Address,1}=Array{Address,1}())

Submit the `node` computation unit to the dask-scheduler for computation. Also submits all
`node`'s dependencies to the scheduler if they have not previously been submitted.
"""
function submit(
    client::Client,
    node::DispatchNode;
    workers::Array{Address,1}=Array{Address,1}()
)
    client.status ∉ SHUTDOWN || error("Client not running. Status: \"$(client.status)\"")

    tkey = to_key(get_key(node))
    if !haskey(client.nodes, tkey)
        task, deps, task_dependencies = serialize_node(client, node)

        tkeys = Array{UInt8, 1}[tkey]
        tasks = Dict{Array{UInt8, 1}, Dict{String, Array{UInt8, 1}}}(tkey => task)
        tasks_deps = Dict{Array{UInt8, 1}, Array{Array{UInt8, 1}}}(
            tkey => task_dependencies
        )

        tkeys, tasks, tasks_deps = serialize_deps(
            client, deps, tkeys, tasks, tasks_deps
        )

        restrictions = Dict{Array{UInt8, 1}, Array{Address, 1}}(tkey => workers)

        send_to_scheduler(
            client,
            Dict{String, Message}(
                "op" => "update-graph",
                "keys" => tkeys,
                "tasks" => tasks,
                "dependencies" => tasks_deps,
                "restrictions" => restrictions,
            )
        )
        for tkey in tkeys
            client.nodes[tkey] = nothing
        end
    end
end

"""
    cancel{T<:DispatchNode}(client::Client, nodes::Array{T, 1})

Cancel all `DispatchNode`s in `nodes`. This stops future tasks from being scheduled
if they have not yet run and deletes them if they have already run. After calling, this
result and all dependent results will no longer be accessible.
"""
function cancel{T<:DispatchNode}(client::Client, nodes::Array{T, 1})
    client.status ∉ SHUTDOWN || error("Client not running. Status: \"$(client.status)\"")

    tkeys = Array{UInt8, 1}[to_key(get_key(node)) for node in nodes]
    send_recv(
        client.scheduler,
        Dict("op" => "cancel", "keys" => tkeys, "client" => client.id)
    )

    for tkey in tkeys
        delete!(client.nodes, tkey)
    end
end

"""
    gather{T<:DispatchNode}(client::Client, nodes::Array{T, 1})

Gather the results of all `nodes`. Requires there to be at least one worker
available to the scheduler or hangs indefinetely waiting for the results.
"""
function gather{T<:DispatchNode}(client::Client, nodes::Array{T, 1})
    if client.status ∉ SHUTDOWN
        send_to_scheduler(
            client,
            Dict{String, Message}(
                "op" => "client-desires-keys",
                "keys" => Array{UInt8, 1}[to_key(get_key(node)) for node in nodes],
                "client" => client.id
            )
        )
    end
    return map(fetch, nodes)
end

"""
    replicate{T<:DispatchNode}(client::Client; nodes::Array{T, 1}=DispatchNode[])

Copy data onto many workers. Helps to broadcast frequently accessed data and improve
resilience.
"""
function replicate{T<:DispatchNode}(client::Client; nodes::Array{T, 1}=DispatchNode[])
    client.status ∉ SHUTDOWN || error("Client not running. Status: \"$(client.status)\"")

    if isempty(nodes)
        keys_to_replicate = collect(Array{UInt8, 1}, keys(client.nodes))
    else
        keys_to_replicate = Array{UInt8, 1}[to_key(get_key(node)) for node in nodes]
    end
    msg = Dict("op" => "replicate", "keys"=> keys_to_replicate)
    send_recv(client.scheduler, msg)
end

"""
    shutdown(client::Client)

Tell the dask-scheduler that this client is shutting down. Does NOT terminate the scheduler
itself nor the workers. This does not have to be called after a session but is useful to
delete all the information submitted by the client from the scheduler and workers (such as
between test runs). To reconnect to the scheduler after calling this function set up a new
client.
"""
function shutdown(client::Client)
    client.status ∉ SHUTDOWN || error("Client not running. Status: \"$(client.status)\"")
    client.status = "closing"

    # Tell scheduler that this client is shutting down
    send_msg(get(client.scheduler_comm), Dict("op" => "close-stream"))
    client.status = "closed"
end

##############################  DISPATCHNODE KEYS FUNCTIONS   ##############################

"""
    get_key{T<:DispatchNode}(node::T)

Calculate an identifying key for `node`. Keys are re-used for identical `nodes` to avoid
unnecessary computations.
"""
get_key{T<:DispatchNode}(node::T) = error("$T does not implement get_key")

function get_key(node::Op)
    return string(
        get_label(node), "-", hash((node.func, node.args, node.kwargs, node.result))
    )
end

function get_key(node::IndexNode)
    return string("Index", string(node.index), "-", hash((node.node, node.result)))
end

function get_key(node::CollectNode)
    return string(get_label(node), "-", hash((node.nodes, node.result)))
end

function get_key(node::DataNode)
    return string("Data", "-", hash((node.data)))
end

##############################     SERIALIZATION FUNCTIONS    ##############################

"""
    serialize_deps(client::Client, deps::Array, tkeys::Array, tasks::Dict, tasks_deps::Dict)

Serialize all dependencies in `deps` to send to the scheduler. For internal use.

# Returns
- `tkeys::Array`: the keys that will be sent to the scheduler in byte form
- `tasks::Dict`: the serialized tasks that will be sent to the scheduler
- `tasks_deps::Dict`: the keys of the dependencies for each task
"""
function serialize_deps{T<:DispatchNode}(
    client::Client,
    deps::Array{T, 1},
    tkeys::Array{Array{UInt8, 1}},
    tasks::Dict{Array{UInt8, 1}, Dict{String, Array{UInt8, 1}}},
    tasks_deps::Dict{Array{UInt8, 1}, Array{Array{UInt8, 1}}},
)
    for dep in deps
        tkey = to_key(get_key(dep))

        tkey in tkeys && continue
        task, deps, task_dependencies = serialize_node(client, dep)

        push!(tkeys, tkey)
        tasks[tkey] = task
        tasks_deps[tkey] = task_dependencies

        if !isempty(deps)
            tkeys, tasks, tasks_deps = serialize_deps(
                client, deps, tkeys, tasks, tasks_deps
            )
        end
    end
    return tkeys, tasks, tasks_deps
end

"""
    serialize_node(client::Client, node::DispatchNode)

Serialize all dependencies in `deps` to send to the scheduler. For internal use.

# Returns a tuple of:
- `task::Dict`: serialized task that will be sent to the scheduler
- `unprocessed_deps::Array`: list of dependencies that haven't been serialized yet
- `task_dependencies::Array`: the keys of the dependencies for `task`
"""
function serialize_node(
    client::Client,
    node::DispatchNode
)::Tuple{Dict{String, Array{UInt8, 1}}, Array{DispatchNode, 1}, Array{Array{UInt8, 1}}}

    # Get task dependencies
    deps = collect(DispatchNode, dependencies(node))
    task = serialize_task(client, node, deps)
    task_dependencies = Array{UInt8, 1}[to_key(get_key(dep)) for dep in deps]

    return task, deps, task_dependencies
end

"""
    serialize_task{T<:DispatchNode}(client::Client, node::T, deps::Array) -> Dict

Serialize `node` into its components. For internal use.
"""
function serialize_task{T<:DispatchNode}(
    client::Client,
    node::T,
    deps::Array{T, 1}
)
    error("$T does not implement serialize_task")
end

function serialize_task{T<:DispatchNode}(
    client::Client,
    node::Op,
    deps::Array{T, 1}
)::Dict{String, Array{UInt8,1}}

    return Dict{String, Array{UInt8,1}}(
        "func" => to_serialize(unpack_data(node.func)),
        "args" => to_serialize(unpack_data(node.args)),
        "kwargs" => to_serialize(unpack_data(node.kwargs)),
        "future" => to_serialize(node.result),
    )
end

function serialize_task{T<:DispatchNode}(
    client::Client,
    node::IndexNode,
    deps::Array{T, 1}
)::Dict{String, Array{UInt8,1}}

    return Dict{String, Array{UInt8,1}}(
        "func" => to_serialize((x)->x[node.index]),
        "args" => to_serialize(unpack_data(deps)),
        "future" => to_serialize(node.result),
    )
end

function serialize_task{T<:DispatchNode}(
    client::Client,
    node::CollectNode,
    deps::Array{T, 1}
)::Dict{String, Array{UInt8,1}}

    return Dict{String, Array{UInt8,1}}(
        "func" => to_serialize((x)->x),
        "args" => to_serialize((unpack_data(deps),)),
        "future" => to_serialize(node.result),
    )
end

function serialize_task{T<:DispatchNode}(
    client::Client,
    node::DataNode,
    deps::Array{T, 1}
)::Dict{String, Array{UInt8,1}}

    return Dict{String, Array{UInt8,1}}(
        "func" => to_serialize((x)->x),
        "args" => to_serialize(unpack_data(node.data)),
    )
end








