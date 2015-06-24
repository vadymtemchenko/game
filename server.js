var SERVER_PORT = 9000;


var WebSocket = require('ws').Server;
var wss = new WebSocket({port: SERVER_PORT});
//var clients = [];

var MAP_SIZE = 20;
var map = {
    tiles: []
}
var Player = function(ws, x, y, avatar) {
    this.x = x;
    this.y = y;
    this.avatar = avatar;
    this.ws = ws;
}

var pp = 0;
//var playerColors = ['red', 'green', 'blue', 'white', 'black', 'yellow', 'gray', 'pink']
var players = {}


var generateMap = function(tiles){
    var l, i;
    for(l = MAP_SIZE; l--;){
        tiles[l] = [];
        for(i = MAP_SIZE; i--;){
            tiles[l][i] = Math.floor(Math.random() * 4);
        }
    }
};

var wsSend = function(ws, data){
    ws.send(JSON.stringify(data));
    console.log('ws.player:', ws.player, 'data:', data);
}

console.log('sys: server started at port', SERVER_PORT);

generateMap(map.tiles);

wss.on('connection', function(ws){
    var p = new Player(ws, 0, 0, '');

    ws.player = ''+(++pp)
    players[ws.player] = p;

    wsSend(ws, {init: {x: p.x, y: p.y, avatar: p.avatar}});

    console.log('sys: player' + pp, 'joined');

    ws.on('message',function(message){
        var msg = JSON.parse(message),
            player = players[ws.player],
            move, avatar;
//        console.log('msg: ', msg);

        if('map' in msg){
            wsSend(ws, {map: map.tiles});
        }

        if('playerss' in msg){
            var list = {}
            for (var p in players) {
                if (p !== ws.player) {
                    list[p]  = {
                        x: players[p].x,
                        y: players[p].y,
                        avatar: players[p].avatar
                    }
                }
            }
            wsSend(ws, {playerss: list});
        }

        if('player' in msg){
            move = msg.player.move;
            if(move){
                if(((Math.abs(player.x - move.x) === 1 && Math.abs(player.y - move.y) === 0)
                || (Math.abs(player.y - move.y) === 1 && Math.abs(player.x - move.x) === 0))
                && (move.x < (MAP_SIZE) && move.y < (MAP_SIZE) && move.x >= 0 && move.y >= 0)){
                    player.x = move.x;
                    player.y = move.y;
                    // send player position to itself
                    wsSend(ws, {
                        player: {
                            x: player.x,
                            y: player.y
                        }
                    });
                    // send player position to other players
                    for(var p in players){
//                        console.log('p:',typeof p,' ws.player:',typeof ws.player)
                        if(p !== ws.player){
//                            console.log('send')
                            wsSend(players[p].ws, {
                                players: {
                                    id: ws.player,
                                    x: player.x,
                                    y: player.y,
                                    avatar: players[ws.player].avatar
                                }
                            });
                        }
                    }
                } else {
                    // if new position is wrong send old position
                    wsSend(ws, {
                        player: {
                            x: player.x,
                            y: player.y
                        }
                    });
                }
            }

            if('new' in msg.player){
                avatar = msg.player['new'].avatar;
                if (avatar) {
                    player.avatar = avatar;

                    for(var p in players){
                        if(p !== ws.player){
                            wsSend(players[p].ws, {
                                players: {
                                    id: ws.player,
                                    x: player.x,
                                    y: player.y,
                                    avatar: players[ws.player].avatar
                                }
                            })
                        }
                    }
                }
            }
        }
    });

    ws.on('close', function(){
        delete players[ws.player];
        console.log('sys: player' + ws.player, 'left game');

        for(var p in players){
            wsSend(players[p].ws, {
                players_off: {
                    id: ws.player
                }
            });
        }
    })
});