#!/bin/sh
# render en paralelo: 4 segmentos + audio + union
cd "$(dirname "$0")"
N=${1:-4}
for i in $(seq 0 $((N-1))); do node --expose-gc main.js part $i $N > _part$i.log 2>&1 & done
wait
node main.js mux $N
