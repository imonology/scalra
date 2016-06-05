
//
//
// icTF.js
//
//
//
// 2011-05-27 修正 nextTick 造成管線阻塞
// 2011-05-28 runTF 裡,  l_busy設為 true 和 l_nativeRunTF 的執行順序 issue (假如 tf 只有一項, 則會有 l_busy 為 true 卻停止 tick 的情況.
// 2011-05-28 l_nativeRunTF 裡, 函數執行完畢釋放 object issue
// 2011-07-20 更換 fifo queue algorithm (http://code.stephenmorley.org/javascript/queues/)
// 2011-09-04 簡化執行流程
//
//
//


//-----------------------------------------
// define local variables
//
//-----------------------------------------



//-----------------------------------------
// define local function
//
//-----------------------------------------

//-----------------------------------------
var l_objPool = {};

exports.createObj = function () {
        var uid = UTIL.createUUID();
        var tmpObj =
        {
            funcTable: [],
            funcCounter: 0,
            retryTimes: 0
        };

        l_objPool[uid] = tmpObj;
        return uid;
}
    
exports.addTF = function (pObj, pFunc) {
        if (l_objPool.hasOwnProperty(pObj) === false)
            return;

        //SR.sys.puts('[icTF]::addTF::adding pObj: ' + pObj + ' and pFunc: ' + pFunc);
        
        var obj = l_objPool[pObj];
        obj.funcTable.push(
            {
                funcKey: pFunc,
                ready: false,
                runningKey: false,
                completeKey: false
            }
        );
};
   
exports.runTF = function (pObj) {
        if (l_objPool.hasOwnProperty(pObj) === false)
        {
            SR.sys.puts('[icTF]::runTF::'+SR.Tags.ERR+'pObj= '+pObj+' not found.');
            return;
        }

        //SR.sys.puts('[icTF]::runTF::'+'run pObj= ' + pObj);
        
        l_objPool[pObj].ready = true;
        l_objPool[pObj].funcTable[ l_objPool[pObj].funcCounter ].funcKey();
};
    
exports.setCompleted = function (pObj, pFunc) {
        if (l_objPool.hasOwnProperty(pObj) === false)
            return;

        // find the completed event and remove it
        for (var i=0;i<l_objPool[pObj].funcTable.length; ++i)
        {
            
            if (l_objPool[pObj].funcTable[i].funcKey === pFunc)
            {   
                l_objPool[pObj].funcTable[i].completeKey = true;
                break;
            }
        }

        // trigger next function
        ++l_objPool[pObj].funcCounter;

        // if no more function, delete event
        if (l_objPool[pObj].funcCounter === l_objPool[pObj].funcTable.length)
        {
            //delete object
            delete l_objPool[pObj];
        }
        else
            l_objPool[pObj].funcTable[ l_objPool[pObj].funcCounter ].funcKey();

};
    
    
    
