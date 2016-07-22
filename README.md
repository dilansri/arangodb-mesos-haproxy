# arangodb-mesos-haproxy

Deploying this on a mesos cluster providing service discovery via mesos-dns (for example DC/OS) will create an internal load balancer over all of your active arangodb coordinators. Just like marathon-lb would do for any marathon app. This is what you will want to use to access an arangodb cluster from the inside (e.g. if you have an application using arangodb as a data store. It automatically updates its internal list. Any changes regarding the coordinators will be automatically adjusted within the proxy.

## Installation

Inspect the marathon.json file and adjust it if needed. Specifically the argument to the cmd needs to be adjusted so it matches the framework name of your arangodb3 instance. If you simply installed arangodb3 using the default settings or you don't know what it is you can leave it as it is.

Finally deploy it:

    dcos marathon app add marathon.json
    
After deployment you will have a load balancer balacing all arangodb requests across all coordinators.

Point your apps using arangodb from the _INSIDE_ to `tcp://arangodb-proxy.mesos:8529` and you are done :)
