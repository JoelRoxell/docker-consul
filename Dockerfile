FROM ubuntu:16.04

MAINTAINER "Joel Roxell <joel.roxell@na-kd.com>"

ARG SERVICE_NAME
ARG BOOTSTRAP
ARG SERVER
ARG DATACENTER
ARG NODE_NAME
ARG ENCRYPT
ARG START_JOIN

# Install required packages and updates
RUN apt-get update
RUN apt-get install unzip -y
RUN apt-get install curl -y
RUN apt-get install -y net-tools
RUN apt-get install -y vim

# Install docker
RUN apt-get -y --no-install-recommends install \
    curl \
    ca-certificates \
    apt-transport-https \
    software-properties-common
RUN curl -fsSL https://apt.dockerproject.org/gpg | apt-key add -
RUN apt-key fingerprint 58118E89F3A912897C070ADBF76221572C52609D
RUN add-apt-repository \
       "deb https://apt.dockerproject.org/repo/ \
       ubuntu-$(lsb_release -cs) \
       main"
RUN apt-get update
RUN apt-get -y install docker-engine

# Install consul
WORKDIR /tmp/consul
RUN curl -O https://releases.hashicorp.com/consul/0.7.4/consul_0.7.4_linux_amd64.zip
RUN unzip consul_0.7.4_linux_amd64.zip
RUN mv consul /usr/local/bin/
RUN mkdir -p /consul/config

RUN mkdir -p /opt/nakd-consul/
WORKDIR /opt/nakd-consul/

COPY utils ./utils
COPY start.sh .

ENTRYPOINT ["bash", "start.sh"]
