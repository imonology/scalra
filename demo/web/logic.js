
    //
    //  Game Logic
    //

    var Logic = function (onUpdate, disable_AI) {
                       
        // who's next player (0: 'O' player, 1: 'X' player, undefined: new game)
        var curr_player = undefined;
        
        // where O, X are located
        var nodes = [];
        
        // who's AI (0: 'O' player, 1: 'X' player)
        var AI_player = 1;
                
        // patterns of winning strings
        var winningPatterns = [
            parseInt("111000000", 2), 
            parseInt("000111000", 2),
            parseInt("000000111", 2),
            parseInt("100100100", 2),
            parseInt("010010010", 2),
            parseInt("001001001", 2),
            parseInt("100010001", 2),
            parseInt("001010100", 2),
        ];    
        
        // check if a player wins
        var checkWinning = function () {
        
            var player = ['O', 'X'];
                    
            for (var z=0; z < player.length; z++) {
                var symbol = player[z];
                
                // check if pattern wins
                var str = '';
                for (var i=0; i < nodes.length; i++)
                    str += (nodes[i] === z ? '1' : '0');
                
                var pattern = parseInt(str, 2);
                         
                for (var j=0; j < winningPatterns.length; j++)
                                    
                    // return winning pattern
                    if ((winningPatterns[j] & pattern) == winningPatterns[j])
                        return {winner: symbol, pattern: winningPatterns[j], cells: nodes};
            }  
    
            // all spaces occuped, return tie game
            for (var i=0; i < 9; i++)
                if (nodes[i] === null)
                    break;
            if (i === 9)             
                return {winner: 'Tie', cells: nodes};
            
            // flip player, keep playing
            curr_player = (curr_player == 0 ? 1 : 0);
            return {winner: '', curr: curr_player, cells: nodes};
        }
        
        // check if AI will make a move
        var checkAI = function () {
            if (curr_player !== AI_player || disable_AI === true)
                return undefined;
                
            // randomly fills in random space
            while (true) {
                var idx = Math.floor(Math.random()*9);
                if (nodes[idx] === null)                    
                    return idx;
            }
        }
        
        // a player makes a move
		// NOTE: passing onUpdate is important here, to be able to send back messages if request is remote
        this.inputCell = function (idx) {
        	
			console.log('inputCell: ' + idx);
			
            // check if game ends
			if (curr_player == undefined)
                return this.resetGame();
			
            // if move is invalid or already occupied, ignore
            if (idx === undefined || nodes[idx] !== null)
                return;
        
            // store player to empty space
            nodes[idx] = curr_player;       
                                
            // check if someone wins
            var result = checkWinning();
            onUpdate(result);
                        
            // reset game if needed, otherwise check AI movement if game still in progress
            if (result.winner !== '')
                curr_player = undefined;
            else 
                this.inputCell(checkAI()); 
        }        
        
        // reset game states and start new game
        this.resetGame = function () {
			
			console.log('resetting game...');
                                      
            // clear all cells									  
            for (var i=0; i < 9; i++)
                nodes[i] = null;        
            
            // randomly determine who starts first                    
            curr_player = Math.floor(Math.random()*2);

            onUpdate({start: curr_player});
			
			// starts if AI players first
			this.inputCell(checkAI());
        }        
        
        this.getCurrent = function () {
            return curr_player;
        }       
        
        // init
        this.inputCell(0);        
    }
    
// make Logic usable in both node.js and webpage    
if (typeof module !== 'undefined')
	module.exports = Logic;        