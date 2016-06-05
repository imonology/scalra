#!/bin/bash
echo Run this script by ../test/runme.sh if any problem occurs.
echo This script is going to test all defined test cases.

# nodejs runtime should return.
time node test_require.js 
echo $?

cd ..

# mocha should pass all test cases
time ./node_modules/mocha/bin/mocha 


