#!/bin/bash

cd /Users/vincent/Develop/dice2win_blockchain_sc/web3

counter=0
while [ $counter -le 65 ]
do
    echo $counter
    node 1000OpenChannel.js $counter >> /Users/vincent/Downloads/test/$counter.log &
    ((counter++))
done

echo "all done"