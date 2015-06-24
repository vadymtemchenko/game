var DEFAULT_AVATAR = 'octo_50_shadow';
var canvas, ctx, ws;
var    map = {
        tiles: null,
        lx: 0,
        ly: 0
    }

var avatars = {}

var players = {}

var view = {
    dx: 0,
    dy: 0,
    w: 0,
    h: 0,
    playerX: 5,
    playerY: 5,
    playerAvatar: '',
    colors: [
        "#844"
        ,"#484"
        ,"#448"
        ,"#884"
    ],
    tileSize: 50,
    calculateOffset: function(mapx, mapy){
        this.dx = mapx * this.tileSize - (this.w - this.tileSize) / 2;
        this.dy = mapy * this.tileSize - (this.h - this.tileSize) / 2;
        console.log('dx: ', this.dx, 'dy: ', this.dy);
    },
    draw: function(){
        var i,l;
        this.clear();
        for(i=map.ly;i--;){
            for(l=map.lx;l--;){
                this.drawTile(i,l, map.tiles[i][l]);
            }
        };
        this.drawPlayer(this.playerX, this.playerY, this.playerAvatar);
        for(var p in players){
            this.drawPlayer(players[p].x, players[p].y, players[p].avatar);
        }
    },
    drawTile: function(mapx, mapy, color){
        ctx.fillStyle = this.colors[color];
        ctx.fillRect(this.getX(mapx, 0), this.getY(mapy, 0) - this.tileSize, this.tileSize, this.tileSize);
    },
    getAvatar: function(avatar){
        if(avatar in avatars){
            return avatar
        } else {
            avatars[avatar] = new Image();
            avatars[avatar].src = 'img/' + avatar + '.png';
            avatars[avatar].onload = function(){
                view.draw();
            }
            return DEFAULT_AVATAR;
        }
    },
    drawPlayer: function(mapx, mapy, avatar){
        ctx.drawImage(avatars[this.getAvatar(avatar)], this.getX(mapx - 0.5)+3, this.getY(mapy + 0.5));
        //ctx.arc(this.getX(mapx), this.getY(mapy), this.tileSize / 4, 0, 2 * Math.PI, false);
        //ctx.fillStyle = avatar in avatars ? avatar : DEFAULT_AVATAR;
        //ctx.fill();
    },
    getX: function(mapx, ax){
        return (mapx + (typeof ax === 'undefined' ? 0.5 : ax))* this.tileSize - this.dx;
    },
    getY: function(mapy, ay){
        return this.h - ((mapy + (typeof ay === 'undefined' ? 0.5 : ay)) * this.tileSize - this.dy);
    },
    clear: function(){
        canvas.width = canvas.width;
    }
}

function change_avatar() {
    view.playerAvatar = select_avatar();
    document.getElementById('avatar_img').src = 'img/' + view.playerAvatar + '.png';
}

function select_avatar() {
    var ava = {
        'обычный':  'octo_50',
        'белый':    'octo_50_white',
        'серый':    'octo_50_gray',
        'чёрный':   'octo_50_black',
        'красный':  'octo_50_red',
        'оранжевый': 'octo_50_orange',
        'жёлтый':   'octo_50_yellow',
        'зелёный':  'octo_50_green',
        'голубой':  'octo_50_cyan',
        'синий':    'octo_50_blue',
        'фиолетовый': 'octo_50_pink'
    }
    return ava[document.getElementById('avatar').value]
}

function connect() {
    var el = document.getElementById('connect_btn')

    if (el.innerHTML === 'connect') {
        ws_connect();
        el.innerHTML = 'logout';
    } else {
        ws_disconnect();
        el.innerHTML = 'connect';
    }
}

window.onload = function(){
    avatars[DEFAULT_AVATAR] = new Image();
    avatars[DEFAULT_AVATAR].src = 'img/' + DEFAULT_AVATAR + '.png';
}

var ws_connect = function() {
//    var ws = new WebSocket('ws://91.195.249.47:9000');
    var ws = new WebSocket(document.getElementById('server').value);

    view.playerAvatar = select_avatar();
    //console.log('socket: ',ws);

    ws.onopen = function(){
        document.getElementById('message').innerHTML += '<p>Connection to server established</p>';
        ws.send(JSON.stringify({
            map: '',
            playerss: '',
            player: {
                new: {
                    avatar: view.playerAvatar
                }
            }
        }));
    };

    ws.onerror = function(e){
        console.log('event: ', e);
        document.getElementById('message').innerHTML += '<p>Error: ' + e.data + '</p>';
    }

    ws.onclose = function(){
        document.getElementById('message').innerHTML += '<p>Connection closed by server</p>';
    }

    ws.onmessage = function(e){
        //console.log('message:', e);
        var draw_flag = false;
        var data = JSON.parse(e.data);
        //console.log('message data: ', e.data);
        if('map' in data){
            map.tiles = data.map;
            map.lx = data.map[0].length;
            map.ly = data.map.length;


            view.calculateOffset(view.playerX, view.playerY);
            //view.draw();
            draw_flag = true;

            window.addEventListener('keydown', function(e){
                console.log(e)
                var LEFT = 37,
                    UP = 38,
                    RIGHT = 39,
                    DOWN = 40;
                switch(e.keyCode){
                    case LEFT:
                        if(view.playerX > 0){
                            view.playerX--;
                        }
                        break;
                    case UP:
                        if(view.playerY < map.ly-1){
                            view.playerY++;
                        }
                        break;
                    case RIGHT:
                        if(view.playerX < map.lx-1){
                            view.playerX++;
                        }
                        break;
                    case DOWN:
                        if(view.playerY > 0){
                            view.playerY--;
                        }
                        break;
                    default:
                        return;
                }
                ws.send(JSON.stringify({
                    player: {
                        move: {
                            x: view.playerX,
                            y: view.playerY
                        }
                    }
                }))
                //view.calculateOffset(view.playerX, view.playerY);
                //view.draw();
            });
        }

        if('init' in data){
            view.playerX = data.init.x;
            view.playerY = data.init.y;
        }

        if('player' in data){
            var player = data.player;
            if(typeof player.x !== 'undefined' && typeof player.y !== 'undefined'){
                //if(view.playerX !== player.x || view.playerY !== player.y){
                    view.playerX = player.x;
                    view.playerY = player.y;
                    view.calculateOffset(view.playerX, view.playerY);
                    //view.draw();
                    draw_flag = true;
                //}
            }
        }

        if('players' in data){
            players[data.players.id] = {
                x: data.players.x,
                y: data.players.y,
                avatar: data.players.avatar
            }
            // view.draw();
            draw_flag = true;
        }

        if('playerss' in data){
            players = data.playerss;
            // view.draw();
            draw_flag = true;
        }

        if('players_off' in data){
            delete players[data.players_off.id];
            // view.draw();
            draw_flag = true;
        }
        if (draw_flag) view.draw();

        //document.getElementById('message').innerHTML += '<p>' + e.data + '</p>';
    }

    var sendMessage = function(){
        var text = document.getElementById('input').innerHTML;
        ws.send(text);
        document.getElementById('input').innerHTML = '';
    }

    canvas = document.getElementById('canvas')
    ctx = canvas.getContext("2d");
    canvas.width = parseInt(window.getComputedStyle(canvas, null).getPropertyValue("width"))
    canvas.height = parseInt(window.getComputedStyle(canvas, null).getPropertyValue("height"))
    view.w = canvas.width;
    view.h = canvas.height;

    /*ctx.moveTo(0,0);
    ctx.lineTo(800,600);
    ctx.stroke();*/




    //console.log()
}