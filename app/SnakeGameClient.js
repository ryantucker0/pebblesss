var currentDir = 83;

var SnakeGame = {
 
        init: function(canvas){
            console.log('init');

                var array = [68, 87, 65, 83];
                var rand = Math.floor(Math.random()*4);
                currentDir = array[rand];

                SnakeGame.SnakeGameClient.init();
               
                this.SnakeGameDrawer.init(canvas);
                this.SnakeGameDrawer.update();
               
                document.onkeydown = this.keyDownEvent;
               
                SnakeGame.MOVES[SnakeGame.WSAD_CODES.UP] = [0, -SEGMENT_SIZE];
                SnakeGame.MOVES[SnakeGame.WSAD_CODES.DOWN] = [0, SEGMENT_SIZE];
                SnakeGame.MOVES[SnakeGame.WSAD_CODES.RIGHT] = [SEGMENT_SIZE, 0];
                SnakeGame.MOVES[SnakeGame.WSAD_CODES.LEFT] = [-SEGMENT_SIZE, 0];
       
                SnakeGame.OPPOSITE_MOVE_MAP[SnakeGame.WSAD_CODES.UP] = SnakeGame.WSAD_CODES.DOWN;
                SnakeGame.OPPOSITE_MOVE_MAP[SnakeGame.WSAD_CODES.DOWN] = SnakeGame.WSAD_CODES.UP;
                SnakeGame.OPPOSITE_MOVE_MAP[SnakeGame.WSAD_CODES.LEFT] = SnakeGame.WSAD_CODES.RIGHT;
                SnakeGame.OPPOSITE_MOVE_MAP[SnakeGame.WSAD_CODES.RIGHT] = SnakeGame.WSAD_CODES.LEFT;
 
                var that = this;
               
                window.snakeMoveInterval = setInterval(function () {
                        var e = {keyCode : currentDir};
 
                        if(SnakeGame.snake.status === SnakeGame.snake.SNAKE_STATES.DEAD){
                                return;
                        }
 
                        var current_move = SnakeGame.MOVES[currentDir];
                        if(!current_move || (currentDir === SnakeGame.ILLEGAL_MOVE)){
                                return;
                        }
                       
                        // block turn back
                        SnakeGame.ILLEGAL_MOVE = SnakeGame.OPPOSITE_MOVE_MAP[currentDir];
                       
                        SnakeGame.SnakeGameClient.sendMove(current_move);
                       
                        // if snake crashed
                        if(!SnakeGame.snake.move(current_move)){
                                SnakeGame.SnakeGameDrawer.die(SnakeGame.snake);
                        }
                        // if snake is still alive
                        else{
                                SnakeGame.SnakeGameDrawer.update();                    
                        }
 
                }, 150);
        },     
               
        snake: null,
        clients: [],
       
        SnakeGameClient: {
               
                websocket: null,
                       
                init: function(){
                        var wsUri = "ws://" + SNAKE_SERVER_IP;
 
                        var websocket = new WebSocket(wsUri);
                       
                        websocket.onopen = function(evt) {
                        };
                       
                        websocket.onclose = function(evt) {
                                alert("CONNECTION LOST");
                                SnakeGame.SnakeGameDrawer.die(SnakeGame.snake);
                        };
                       
                        websocket.onmessage = function(evt) {
                                SnakeGame.SnakeGameClient.dispatchMsg(JSON.parse(evt.data));
                        };
                       
                        websocket.onerror = function(evt) {
                        };
                       
                        this.websocket = websocket;
                },
               
                dispatchMsg: function(obj){
 
                        switch (obj.type.id) {
                                case SnakeMessage.TYPES.INIT.id:
                                       
                                        SnakeGame.snake = new Snake([obj.msg.head]);
                                        //console.warn(" - INIT - HELLO, snakeID = " + SnakeGame.snake.snakeID)
                                        console.warn(obj.msg)
                                        SnakeGame.SnakeGameClient.updateBoard(obj.msg.board);
                                        obj.msg.clients.forEach(function(s){
                                                 SnakeGame.clients[s.snakeID] = new Snake(s.body);
                                        });
                                       
                                        SnakeGameBoard.updateBuffer(SnakeGame.snake);
 
                                        SnakeGame.SnakeGameDrawer.initDraw();  
                                        break;
                                       
                                case SnakeMessage.TYPES.MOVE.id:
                                       
                                        //console.log("MOVE")
                                        //console.log(obj.msg)
                                        var snake_to_move = SnakeGame.clients[obj.msg.snakeID];
 
                                        if(!snake_to_move.move(obj.msg.move)){
                                                SnakeGame.SnakeGameDrawer.die(snake_to_move);
                                                SnakeGame.clients[obj.msg.snakeID] = undefined;
                                        }
                                        else{
                                                SnakeGame.SnakeGameDrawer.update();
                                        }
                                       
                                        break;
       
                                case SnakeMessage.TYPES.NEW_SNAKE.id:
                                        //console.info("NEW SNAKE SWITCH:");
                                        //console.info(obj);
                                        var new_snake = new Snake(obj.msg.snake.body);
                                        SnakeGame.clients[obj.msg.snake.snakeID] = new_snake;
                                        SnakeGameBoard.updateBuffer(new_snake);
                                        SnakeGame.SnakeGameDrawer.update();
                                        break;
                               
                                case SnakeMessage.TYPES.REMOVE_SNAKE.id:
                                        ///console.info("REMOVE SNAKE SWITCH:");
                                        //console.info(obj);
                                       
                                        var to_remove_snakeID = obj.msg.snakeID;
                                        var snake = SnakeGame.clients[to_remove_snakeID];
                                        SnakeGame.SnakeGameDrawer.die(snake);
                                        SnakeGameBoard.deleteSnake(snake);
                                        SnakeGame.clients[to_remove_snakeID] = undefined;
                                        SnakeGame.SnakeGameDrawer.update();
                                        break;
                                       
                                case SnakeMessage.TYPES.NEW_BLOCK.id:
                                        //console.info("NEW RED BLOCK SWITCH:");
                                        //console.info(obj);
                                       
                                        var s = new Segment(obj.msg.new_block.x, obj.msg.new_block.y, Segment.SEGMENT_TYPES.RED_BLOCK, null);
                                       
                                        SnakeGameBoard.putSegment(s);
                                        SnakeGame.SnakeGameDrawer.update();
                                        break;

                                case SnakeMessage.TYPES.SCORE.id:
                                        // TODO update the HTML with the new list of scores
                                        var $scores = $('#scores').empty();
                                        obj.msg.forEach(function(score, snakeId) {
                                            //$scores.append($('<li>[' + snakeId + ']: ' + score + '</li>'));
                                            console.log("color: " + score.color );
                                            //$scores.append($("<tr><td><div style=\"background-color:" + score.color + "; width: 25px; height: 25px;\" id=\"" + snakeId + "\" data-color=\"" + score.color + "\" class=\"colorbox\"</div></td><td>" + score.score + "</td></tr>"));
                                            //$("#" + snakeID).css("background-color", score.color);
                                        });
                                        console.log(SnakeMessage.msg);
                                        break;
                                       
                                default:
                                        //console.info("DEFAULT SWITCH:");
                                        console.info(obj);
                                        break;
                                }
                },
                       
                updateBoard: function(segments_array){
                        segments_array.forEach(function(s){
                                var segment = new Segment(s.x, s.y, Segment.getTypeByValue(s.typeV), s.snakeID);
                                SnakeGameBoard.putSegment(segment);
                        });
                },
               
                sendMove: function(_move){
                       
                        var msg = new SnakeMessage(SnakeMessage.TYPES.MOVE, {
                                move: _move,
                        });
                       
                        this.websocket.send(JSON.stringify(msg));
                },     
        },
       
        SnakeGameDrawer: {
               
                canvas: null,
                context: null,
               
                init: function(canvas){
                        this.canvas = canvas;
                        this.canvas.width = BOARD_W;
                        this.canvas.height = BOARD_H;
                       
                        this.context = canvas.getContext("2d");
                        this.initDraw();
                },
               
                // draws every segment
                initDraw: function(){
                        var that = this;
                        SnakeGameBoard.board.forEach(function(row){
                                row.forEach(function(s){
                                        that.drawSegment(s);
                                });
                        });
                },
               
                drawSegment: function(s){
                        this.context.beginPath();
                        this.context.moveTo(s.x, s.y);
                        this.context.rect(s.x, s.y, SEGMENT_SIZE, SEGMENT_SIZE);
                        console.log("snake color: " + s.color);
                        this.context.fillStyle = s.color || s.getColor();
                        this.context.fill();
                },
               
                update: function(){
                       
                        var to_change = SnakeGameBoard.getSegmentsToUpdate();
 
                        for(var i in to_change){
                                var current_segment = to_change[i];
                                this.drawSegment(current_segment);
                        };
                       
                        to_change.length = 0;
                },
               
                die: function(snake){
                       
                        var dead_colors = ["#D1D1D1", "#BAB6B8", "#A3A0A1", "#878686", "#6B6A6A", "#525252"];
                        for(var b in snake.body){
                               
                                var cb = snake.body[b];
                               
                                (function(cb, b){
                                       
                                        setTimeout(function(){
                                                cb.type = Segment.SEGMENT_TYPES.DEAD_SNAKE;
                                                cb.color = dead_colors[b] || dead_colors[dead_colors.length - 1];
                                               
                                                SnakeGameBoard.putSegment(cb);
                                                SnakeGame.SnakeGameDrawer.update();
                                        }, b * 50);
                                       
                                        setTimeout(function(){
                                                cb.type = Segment.SEGMENT_TYPES.DEAD_SNAKE;
                                                cb.color = Segment.SEGMENT_TYPES.BLANK.color;
                                               
                                                SnakeGameBoard.putSegment(cb);
                                                SnakeGame.SnakeGameDrawer.update();
                                        }, 50 * (snake.body.length - b) + snake.body.length * 50);
                                       
                                })(cb, b);
                        };
                       
                        snake.die();
                },
        },
       
        WSAD_CODES: {
                UP: 87,
                DOWN: 83,
                LEFT: 65,
                RIGHT: 68,
        },
       
        ILLEGAL_MOVE: undefined,
       
        MOVES: {},
       
        // map used to block "turn back" snake
        OPPOSITE_MOVE_MAP: {},
       
        keyDownEvent: function(e){
               
                SnakeGame.returnKeyCode(e);
                console.log(e.keyCode);
                console.log(currentDir);
                if(SnakeGame.snake.status === SnakeGame.snake.SNAKE_STATES.DEAD){
                        return;
                }

                var inKey = e;
                //console.log(e.keyCode);
                window.clearInterval(snakeMoveInterval);
                
                window.snakeMoveInterval = setInterval(function () {
                        var e = {keyCode : currentDir};
 
                        if(SnakeGame.snake.status === SnakeGame.snake.SNAKE_STATES.DEAD){
                                return;
                        }
                        
                        var current_move = SnakeGame.MOVES[currentDir];
                        if(!current_move || (currentDir === SnakeGame.ILLEGAL_MOVE)){
                                return;
                        }
                       
                        // block turn back
                        SnakeGame.ILLEGAL_MOVE = SnakeGame.OPPOSITE_MOVE_MAP[currentDir];
                       
                        SnakeGame.SnakeGameClient.sendMove(current_move);
                       
                        // if snake crashed
                        if(!SnakeGame.snake.move(current_move)){
                                SnakeGame.SnakeGameDrawer.die(SnakeGame.snake);
                        }
                        // if snake is still alive
                        else{
                                SnakeGame.SnakeGameDrawer.update();                    
                        }
 
                }, 100); 
                
                
                var current_move = SnakeGame.MOVES[currentDir];
                if(!current_move || (currentDir === SnakeGame.ILLEGAL_MOVE)){
                        return;
                }
               
                // block turn back
                SnakeGame.ILLEGAL_MOVE = SnakeGame.OPPOSITE_MOVE_MAP[currentDir];
               
                SnakeGame.SnakeGameClient.sendMove(current_move);
               
                // if snake crashed
                if(!SnakeGame.snake.move(current_move)){
                        SnakeGame.SnakeGameDrawer.die(SnakeGame.snake);
                }
                // if snake is still alive
                else{
                        SnakeGame.SnakeGameDrawer.update();                    
                }
        },

        returnKeyCode: function(e){
            //65 L
            // 68 R
            var key = e.keyCode;

            if(key === 65)
            {
                switch(currentDir){
                    case 65 : currentDir = 83; break;
                    case 83 : currentDir = 68; break;
                    case 87 : currentDir = 65; break;
                    case 68 : currentDir = 87; break;
                }
            }
            else if(key === 68)
            {
                switch(currentDir){
                    case 65 : currentDir = 87; break;
                    case 83 : currentDir = 65; break;
                    case 87 : currentDir = 68; break;
                    case 68 : currentDir = 83; break;
                }
            }

        }
       
};

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function HSVtoRGB(h, s, v) {
    var r, g, b, i, f, p, q, t;
    if (h && s === undefined && v === undefined) {
        s = h.s, v = h.v, h = h.h;
    }
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    return {
        r: Math.floor(r * 255),
        g: Math.floor(g * 255),
        b: Math.floor(b * 255)
    };
}

function hsvToHex(h, s, v) {
    var rgb = HSVtoRGB(h, s, v);
    return rgbToHex(rgb.r, rgb.g, rgb.b);
}