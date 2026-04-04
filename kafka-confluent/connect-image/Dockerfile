FROM debezium/connect:2.4
# Install Confluent Avro serializer and Schema Registry client jars
ARG VERSION=7.4.0
RUN mkdir -p /kafka/connect/libs && \
    curl -fsSL -o /kafka/connect/libs/kafka-avro-serializer-${VERSION}.jar https://packages.confluent.io/maven/io/confluent/kafka-avro-serializer/${VERSION}/kafka-avro-serializer-${VERSION}.jar && \
    curl -fsSL -o /kafka/connect/libs/kafka-schema-registry-client-${VERSION}.jar https://packages.confluent.io/maven/io/confluent/kafka-schema-registry-client/${VERSION}/kafka-schema-registry-client-${VERSION}.jar && \
    # ensure plugin path includes our libs
    ls -la /kafka/connect/libs
# also copy jars into a plugin dir so Connect's plugin classloader can see them
RUN cp /kafka/connect/libs/kafka-avro-serializer-${VERSION}.jar /kafka/connect/debezium-connector-postgres/ || true && \
    cp /kafka/connect/libs/kafka-schema-registry-client-${VERSION}.jar /kafka/connect/debezium-connector-postgres/ || true
ENV PLUGIN_PATH=/kafka/connect
