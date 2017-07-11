var documenterSearchIndex = {"docs": [

{
    "location": "index.html#",
    "page": "Home",
    "title": "Home",
    "category": "page",
    "text": ""
},

{
    "location": "index.html#DaskDistributedDispatcher.jl-1",
    "page": "Home",
    "title": "DaskDistributedDispatcher.jl",
    "category": "section",
    "text": "CurrentModule = DaskDistributedDispatcherDaskDistributedDispatcher integrates Dispatcher.jl with the python dask.distributed scheduler service."
},

{
    "location": "index.html#Overview-1",
    "page": "Home",
    "title": "Overview",
    "category": "section",
    "text": "Dispatcher.jl builds the graph of julia computations and submits jobs via the julia client to the  dask.distributed scheduler, which is in charge of determining when and where to schedule jobs on the julia workers. Thus, the computations are scheduled and executed efficiently."
},

{
    "location": "index.html#Frequently-Asked-Questions-1",
    "page": "Home",
    "title": "Frequently Asked Questions",
    "category": "section",
    "text": "How can the python dask.distributed scheduler be used for julia computations?The dask.distributed scheduler can be used in a julia workflow environment since it is language agnostic (no information that passes in or out of it is Python-specific). Instead the scheduler communicates with the workers/clients entirely using msgpack and long bytestrings."
},

{
    "location": "index.html#Documentation-Contents-1",
    "page": "Home",
    "title": "Documentation Contents",
    "category": "section",
    "text": "Pages = [\"pages/manual.md\", \"pages/api.md\"]"
},

{
    "location": "pages/manual.html#",
    "page": "Manual",
    "title": "Manual",
    "category": "page",
    "text": ""
},

{
    "location": "pages/manual.html#Manual-1",
    "page": "Manual",
    "title": "Manual",
    "category": "section",
    "text": ""
},

{
    "location": "pages/manual.html#Motivation-1",
    "page": "Manual",
    "title": "Motivation",
    "category": "section",
    "text": "The primary reason for integrating the dask.distributed sheduler with Dispatcher.jl is to be able to guarantee a stronger degree of effiency for computations run on Dispatcher and to allow for fluctuating worker resources."
},

{
    "location": "pages/manual.html#Design-1",
    "page": "Manual",
    "title": "Design",
    "category": "section",
    "text": "The key components of this system are:the dask-scheduler process that schedules computations and manages state\na julia client used by Dispatcher.jl that submits work to the scheduler\njulia workers that accept instructions from the scheduler, fetch dependencies, execute compuations, store data, and communicate state to the schedulerIn order to avoid redundant computations, the client will reuse previously computed results for identical operations."
},

{
    "location": "pages/manual.html#Setup-1",
    "page": "Manual",
    "title": "Setup",
    "category": "section",
    "text": "To use this package you also need to install Dask.Distributed."
},

{
    "location": "pages/manual.html#Usage-1",
    "page": "Manual",
    "title": "Usage",
    "category": "section",
    "text": "First, start a dask-scheduler process:$ dask-scheduler\nScheduler started at 127.0.0.1:8786Then, start a julia session and set up a cluster of julia client/workers, providing them the scheduler's address:using DaskDistributedDispatcher\nclient = Client(\"127.0.0.1:8786\")\n\naddprocs()\n@everywhere using DaskDistributedDispatcher\n\n@spawn worker = Worker(\"127.0.0.1:8786\")\n@spawn worker = Worker(\"127.0.0.1:8786\")You can then submit Dispatcher Ops units of computation that can be run to the client (which will relay it to the dask-scheduler to be scheduled and executed on a worker):op = Dispatcher.Op(Int, 2.0)\nsubmit(client, op)\nresult = result(client, op)Alternatively, you can get the results directly from the Op:result = fetch(op)If needed, you can specify which worker to run the computations on:using DaskDistributedDispatcher\nclient = Client(\"127.0.0.1:8786\")\n\npnums = addprocs(1)\n@everywhere using DaskDistributedDispatcher\n\nworker_address = @fetchfrom pnums[1] begin\n    worker = Worker(\"127.0.0.1:8786\")\n    return address(worker)\nend\n\nop = Dispatcher.Op(Int, 1.0)\nsubmit(client, op, workers=[worker_address])\nresult = result(client, op)Currently, if the Op submitted to the client results in an error, the result of the Op will then be a string representation of the error that occurred on the worker.julia> op = Dispatcher.Op(Int, 2.1)\njulia> submit(client, op)\njulia> result = result(client, op)\n\"error\"=>\"InexactError\""
},

{
    "location": "pages/api.html#",
    "page": "API",
    "title": "API",
    "category": "page",
    "text": ""
},

{
    "location": "pages/api.html#API-1",
    "page": "API",
    "title": "API",
    "category": "section",
    "text": ""
},

{
    "location": "pages/api.html#DaskDistributedDispatcher.Client",
    "page": "API",
    "title": "DaskDistributedDispatcher.Client",
    "category": "Type",
    "text": "Client\n\nA Client represents a client that the user can interact with to submit computations to the scheduler and gather results.\n\nFields\n\nops::Dict{String, Dispatcher.Op}: maps keys to their dispatcher ops\nid::String: this client's identifier\nstatus::String: status of this client\nscheduler_address::Address: the dask-distributed scheduler ip address and port information\nscheduler::Rpc: manager for discrete send/receive open connections to the scheduler\nconnecting_to_scheduler::Bool: if client is currently trying to connect to the scheduler\nscheduler_comm::Nullable{BatchedSend}: batched stream for communication with scheduler\npending_msg_buffer::Array: pending msgs to send on the batched stream\n\n\n\n"
},

{
    "location": "pages/api.html#DaskDistributedDispatcher.Client-Tuple{String}",
    "page": "API",
    "title": "DaskDistributedDispatcher.Client",
    "category": "Method",
    "text": "Client(scheduler_address::String; throw_errors::Bool=true) -> Client\n\nConstruct a Client which can then be used to submit computations or gather results from the dask-scheduler process. Set throw_errors to false if you want to instead receive string representations of any errors thrown while running a user submitted task.\n\n\n\n"
},

{
    "location": "pages/api.html#DaskDistributedDispatcher.submit-Tuple{DaskDistributedDispatcher.Client,Dispatcher.Op}",
    "page": "API",
    "title": "DaskDistributedDispatcher.submit",
    "category": "Method",
    "text": "submit(client::Client, op::Dispatcher.Op; workers::Array=[])\n\nSubmit the Op computation unit to the dask-scheduler for computation.\n\n\n\n"
},

{
    "location": "pages/api.html#DaskDistributedDispatcher.result-Tuple{DaskDistributedDispatcher.Client,Dispatcher.Op}",
    "page": "API",
    "title": "DaskDistributedDispatcher.result",
    "category": "Method",
    "text": "result(client::Client, op::Dispatcher.Op) -> Any\n\nGather the result of the Op computation unit. Requires there to be at least one worker available to the scheduler or hangs indefinetely.\n\n\n\n"
},

{
    "location": "pages/api.html#DaskDistributedDispatcher.cancel-Tuple{DaskDistributedDispatcher.Client,Array{Dispatcher.Op,N}}",
    "page": "API",
    "title": "DaskDistributedDispatcher.cancel",
    "category": "Method",
    "text": "cancel(client::Client, ops::Array{Dispatcher.Op})\n\nCancel all Ops in ops. This stops future tasks from being scheduled if they have not yet run and deletes them if they have already run. After calling, this result and all dependent results will no longer be accessible.\n\n\n\n"
},

{
    "location": "pages/api.html#DaskDistributedDispatcher.gather-Tuple{DaskDistributedDispatcher.Client,Array{Dispatcher.Op,N}}",
    "page": "API",
    "title": "DaskDistributedDispatcher.gather",
    "category": "Method",
    "text": "gather(client::Client, ops::Array{Dispatcher.Op})\n\nGather the results of all ops. Requires there to be at least one worker available to the scheduler or hangs indefinetely waiting for the results.\n\n\n\n"
},

{
    "location": "pages/api.html#DaskDistributedDispatcher.shutdown-Tuple{DaskDistributedDispatcher.Client}",
    "page": "API",
    "title": "DaskDistributedDispatcher.shutdown",
    "category": "Method",
    "text": "shutdown(client::Client)\n\nTell the dask-scheduler to terminate idle workers and that this client is shutting down. Does NOT terminate the scheduler itself. This does not have to be called after a session but is useful when you want to delete all the information submitted by the client from the scheduler and workers (such as between test runs). If you want to reconnect to the scheduler after calling this function you will have to set up a new client.\n\n\n\n"
},

{
    "location": "pages/api.html#DaskDistributedDispatcher.default_client-Tuple{}",
    "page": "API",
    "title": "DaskDistributedDispatcher.default_client",
    "category": "Method",
    "text": "default_client()\n\nReturn the default global client if a client has been registered with the dask-scheduler.\n\n\n\n"
},

{
    "location": "pages/api.html#DaskDistributedDispatcher.get_key-Tuple{Dispatcher.Op}",
    "page": "API",
    "title": "DaskDistributedDispatcher.get_key",
    "category": "Method",
    "text": "get_key(op::Dispatcher.Op)\n\nCalculate an identifying key for op. Keys are re-used for identical ops to avoid unnecessary computations.\n\n\n\n"
},

{
    "location": "pages/api.html#Client-1",
    "page": "API",
    "title": "Client",
    "category": "section",
    "text": "Client\nClient(::String)\nsubmit(::Client, ::Dispatcher.Op; ::Array)\nresult(::Client, ::Dispatcher.Op)\ncancel(::Client, ::Array{Dispatcher.Op})\ngather(::Client, ::Array{Dispatcher.Op})\nshutdown(::Client)\ndefault_client()\nget_key(::Dispatcher.Op)"
},

{
    "location": "pages/api.html#DaskDistributedDispatcher.Worker",
    "page": "API",
    "title": "DaskDistributedDispatcher.Worker",
    "category": "Type",
    "text": "Worker\n\nA Worker represents a worker endpoint in the distributed cluster that accepts instructions from the scheduler, fetches dependencies, executes compuations, stores data, and communicates state to the scheduler.\n\nFields\n\nCommunication Management\n\nscheduler_address::Address: the dask-distributed scheduler ip address and port information\nbatched_stream::Nullable{BatchedSend}: batched stream for communication with scheduler\nscheduler::Rpc: manager for discrete send/receive open connections to the scheduler\ntarget_message_size::AbstractFloat: target message size for messages\nconnection_pool::ConnectionPool: manages connections to peers\ntotal_connections::Integer: maximum number of concurrent connections allowed\n\nServer\n\naddress::Address:: ip address and port that this worker is listening on\nlistener::Base.TCPServer: tcp server that listens for incoming connections\ncomms::Dict{TCPSocket, String}: current accepted connections to this worker\n\nHandlers\n\nhandlers::Dict{String, Function}: handlers for operations requested by open connections\ncompute_stream_handlers::Dict{String, Function}: handlers for compute stream operations\n\nData management\n\ndata::Dict{String, Any}: maps keys to the results of function calls (actual values)\nfutures::Dict{String, DeferredFutures.DeferredFuture}: maps keys to their DeferredFuture\nnbytes::Dict{String, Integer}: maps keys to the size of their data\ntypes::Dict{String, Type}: maps keys to the type of their data\n\nTask management\n\ntasks::Dict{String, Tuple}: maps keys to the function, args, and kwargs of a task\ntask_state::Dict{String, String}: maps keys tot heir state: (waiting, executing, memory)\npriorities::Dict{String, Tuple}: run time order priority of a key given by the scheduler\npriority_counter::Integer: used to also prioritize tasks by their order of arrival\n\nTask state management\n\ntransitions::Dict{Tuple, Function}: valid transitions that a task can make\ndata_needed::Deque{String}: keys whose data we still lack\nready::PriorityQueue{String, Tuple, Base.Order.ForwardOrdering}: keys ready to run\nexecuting::Set{String}: keys that are currently executing\n\nDependency management\n\ndep_transitions::Dict{Tuple, Function}: valid transitions that a dependency can make\ndep_state::Dict{String, String}: maps dependencies with their state   (waiting, flight, memory)\ndependencies::Dict{String, Set}: maps a key to the data it needs to run\ndependents::Dict{String, Set}: maps a dependency to the keys that use it\nwaiting_for_data::Dict{String, Set}: maps a key to the data it needs that we don't have\npending_data_per_worker::DefaultDict{String, Deque}: data per worker that we want\nwho_has::Dict{String, Set}: maps keys to the workers believed to have their data\nhas_what::DefaultDict{String, Set{String}}: maps workers to the data they have\n\nPeer communication\n\nin_flight_tasks::Dict{String, String}: maps a dependency and the peer connection for it\nin_flight_workers::Dict{String, Set}: workers from which we are getting data from\nsuspicious_deps::DefaultDict{String, Integer}: number of times a dependency has not been   where it is expected\nmissing_dep_flight::Set{String}: missing dependencies\n\nInformational\n\nstatus::String: status of this worker\nexceptions::Dict{String, String}: maps erred keys to the exception thrown while running\ntracebacks::Dict{String, String}: maps erred keys to the exception's traceback thrown\nstartstops::DefaultDict{String, Array}: logs of transfer, load, and compute times\n\nValidation\n\nvalidate::Bool: decides if the worker validates its state during execution\n\n\n\n"
},

{
    "location": "pages/api.html#DaskDistributedDispatcher.Worker-Tuple{String}",
    "page": "API",
    "title": "DaskDistributedDispatcher.Worker",
    "category": "Method",
    "text": "Worker(scheduler_address::String; validate=true)\n\nCreate a Worker that listens on a random port between 1024 and 9000 for incoming messages. Set validate to false to improve performance.\n\n\n\n"
},

{
    "location": "pages/api.html#DaskDistributedDispatcher.address-Tuple{DaskDistributedDispatcher.Worker}",
    "page": "API",
    "title": "DaskDistributedDispatcher.address",
    "category": "Method",
    "text": "address(server::Server) -> String\n\nReturn this server's address formatted as an String\n\n\n\n"
},

{
    "location": "pages/api.html#Base.show-Tuple{IO,DaskDistributedDispatcher.Worker}",
    "page": "API",
    "title": "Base.show",
    "category": "Method",
    "text": "show(io::IO, worker::Worker)\n\nPrint a representation of the worker and it's state.\n\n\n\n"
},

{
    "location": "pages/api.html#Worker-1",
    "page": "API",
    "title": "Worker",
    "category": "section",
    "text": "Worker\nWorker(::String)\naddress(::Worker)\nshow(::IO, ::Worker)"
},

{
    "location": "pages/api.html#DaskDistributedDispatcher.Server",
    "page": "API",
    "title": "DaskDistributedDispatcher.Server",
    "category": "Type",
    "text": "Server\n\nAbstract type to listen for and handle incoming messages.\n\n\n\n"
},

{
    "location": "pages/api.html#DaskDistributedDispatcher.address",
    "page": "API",
    "title": "DaskDistributedDispatcher.address",
    "category": "Function",
    "text": "address(server::Server) -> String\n\nReturn this server's address formatted as an String\n\n\n\n"
},

{
    "location": "pages/api.html#DaskDistributedDispatcher.start_listening",
    "page": "API",
    "title": "DaskDistributedDispatcher.start_listening",
    "category": "Function",
    "text": "listen(server::Server)\n\nListen for incoming connections on a port and dispatches them to be handled.\n\n\n\n"
},

{
    "location": "pages/api.html#Server-1",
    "page": "API",
    "title": "Server",
    "category": "section",
    "text": "Server\naddress\nstart_listening"
},

{
    "location": "pages/api.html#DaskDistributedDispatcher.Address",
    "page": "API",
    "title": "DaskDistributedDispatcher.Address",
    "category": "Type",
    "text": "Address\n\nA representation of an endpoint that can be connected to. It is categorized by its scheme (tcp is currently the only protocol supported), host, and port.\n\n\n\n"
},

{
    "location": "pages/api.html#DaskDistributedDispatcher.Address-Tuple{String}",
    "page": "API",
    "title": "DaskDistributedDispatcher.Address",
    "category": "Method",
    "text": "Address(address::String) -> Address\n\nParse address and returns the corresponding Address object.\n\n\n\n"
},

{
    "location": "pages/api.html#DaskDistributedDispatcher.Address-Tuple{Union{IPAddr,String},Integer}",
    "page": "API",
    "title": "DaskDistributedDispatcher.Address",
    "category": "Method",
    "text": "Address(address::String) -> Address\n\nReturn the corresponding Address object to the components host and port. By default the tcp protocol is assumed.\n\n\n\n"
},

{
    "location": "pages/api.html#Address-1",
    "page": "API",
    "title": "Address",
    "category": "section",
    "text": "Address\nAddress(::String)\nAddress(::Union{IPAddr, String}, ::Integer)"
},

]}