docker run \
  --env-file .env \
  --add-host=host.docker.internal:host-gateway \
  -v ./config.alloy:/etc/alloy/config.alloy \
  -p 12345:12345 \
  grafana/alloy:v1.10.2 \
    run --server.http.listen-addr=0.0.0.0:12345 --storage.path=/var/lib/alloy/data \
    /etc/alloy/config.alloy