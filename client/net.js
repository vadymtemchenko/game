
//-----------------------------------------------------------------------------
//
//                               DATA HANDLERS
//
//-----------------------------------------------------------------------------

var onDataMap = function(_map){
    var i, j, k, lx, ly, coords;

    map.tiles = _map.main.tiles;
    map.hmap = _map.main.hmap;
    map.bends = _map.main.bends;

    // set links tiles to points
    ly = map.tiles.length;
    lx = map.tiles[0].length;
    map.lx = lx;
    map.ly = ly;
    
    map.centerIndexX = localToIndex(player.x, player.y)[0];
    map.centerIndexY = localToIndex(player.x, player.y)[1];

    for(j = 0; j < ly; j++){
        map.links.push([]);
        for(i = 0; i < lx; i++){
//            map.links[j].push([]);

            if(j%2===0){
                map.links[j].push([
                    i, j,
                    i+1, j+1,
                    i, j+2,
                    i, j+1
                ]);
            } else {
                map.links[j].push([
                    i+1, j,
                    i+1, j+1,
                    i+1, j+2,
                    i, j+1
                ]);
            }
        }
    }

    // init points array
    ly += 2;
    lx += 1;
    for(j = 0; j < ly; j++){
        map.points.push([]);
        for(i = 0; i < lx; i++){
            map.points[j].push([0,0]);
        }
    }

    // recalc points
    planeAll();
    view.calculateOffsetZ(player.x, player.y);
    map.recalcPoints();

    needRedraw = true;
    needRedrawTiles = true;

    for (j=0; j<map.ly; j++) {
        for (i=0; i<map.lx; i++) {
            if (map.tiles[j][i] >= 0) {
                coords = indexToLocal(i, j);
                for (k=0; k<0; k++) {
                    if (Math.random()*10 < 1) {
                        loadResource({
                            type: 'flower04png',
                            x: Math.random() + coords[0],
                            y: Math.random() + coords[1]
                        });
                    }
                }
                for (k=0; k<0; k++) {
                    if (Math.random()*10 < 1) {
                        loadResource({
                            type: 'flower05png',
                            x: Math.random() + coords[0],
                            y: Math.random() + coords[1]
                        });
                    }
                }
                for (k=0; k<0; k++) {
                    if (Math.random()*40 < 1) {
                        loadResource({
                            type: 'oduvani',
                            x: Math.random() + coords[0],
                            y: Math.random() + coords[1]
                        });
                    }
                }
                for (k=0; k<0; k++) {
                    if (Math.random()*40 < 1) {
                        loadResource({
                            type: 'poppies1',
                            x: Math.random() + coords[0],
                            y: Math.random() + coords[1]
                        });
                    }
                }
                for (k=0; k<0; k++) {
                    loadResource({
                        type: 'grass01png',
                        x: Math.random() + coords[0],
                        y: Math.random() + coords[1]
                    });
                }




            }
        }
    }

    window.addEventListener('mousedown', mouse.mouseDown);
    window.addEventListener('mousemove', mouse.mouseMove);
    window.addEventListener('mouseup', mouse.mouseUp);
    document.body.oncontextmenu = function(e){return false;};

//    view.canvasView.addEventListener('click', mouseClick);

//    window.addEventListener('keydown', function(e){
//        console.log(e);
//        var LEFT = 37,
//            UP = 38,
//            RIGHT = 39,
//            DOWN = 40;
//        switch(e.keyCode){
//            case LEFT:
//                if(view.playerX > 0){
//                    view.playerX--;
//                }
//                break;
//            case UP:
//                if(view.playerY < map.ly-1){
//                    view.playerY++;
//                }
//                break;
//            case RIGHT:
//                if(view.playerX < map.lx-1){
//                    view.playerX++;
//              x, y  }
//                break;
//            case DOWN:
//                if(view.playerY > 0){
//                    view.playerY--;
//                }
//                break;
//            default:
//                return;
//        }
//        ws.send(JSON.stringify({
//            player: {
//                move: {
//                    x: view.playerX,
//                    y: view.playerY
//                }
//            }
//        }));
//    });
};

//var onDataHeightMap = function(_hmap){
//    map.hmap = _hmap;
//    needRedraw = true;
//};

var onDataEntities = function(_entities){
    var type, key;

    for(type in _entities){
        for(key in _entities[type]){
            entities[type][key] = _entities[type][key];
        }
        loadImage(entities[type], entities[type].imgUrl);
    }
};

var onDataObjects = function(objects){
    var i = objects.length;

    for(; i--;){
        if(checkObject(objects[i]))
            loadResource(objects[i]);
    }
};

var onDataLogin = function(login){
    var node;

    if(login){
        node = document.getElementById('login');
        node.parentNode.removeChild(node);
        view.init();
        redraw();
    }
};

var onDataInit = function(init){
    player.obj = loadResource({x: init.x, y: init.y, type: init.avatar});
    player.x = init.x;
    player.y = init.y;
    player.chunk = {
        dx: init.chunkDx,
        dy: init.chunkDy
    }; 
    
    map.centerLocalX = init.x;
    map.centerLocalY = init.y;

    view.calculateOffset(player.obj.x, player.obj.y);
//    map.sx = view.sx;
//    map.sy = view.sy;
};

var onDataPlayers = function(_players){
    var key;

    for(key in _players){
        if(!(_players[key].name in players)){
            players[_players[key].name] = {obj: loadResource({x: _players[key].x, y: _players[key].y, type: _players[key].avatar})};
        }
    }
};

var onDataPlayerLeft = function(playerLeft){
    var obj;

    obj = players[playerLeft].obj;
    objects.splice(objects.indexOf(obj), 1);
    objectsSorted.splice(objectsSorted.indexOf(obj), 1);
    delete players[playerLeft];

//    _(obj);
    needRedraw = true;
};

var onDataMove = function(data){
    _('response',data);
    
    player.obj.x = data.x;
    player.obj.y = data.y;
    player.obj.ok = false;
//    delete player.obj.zOrder;
    needRedraw = true;
};

var onDataMovePlayers = function(data){
    var key, p;
    
    for(key in data){
        p = players[data[key].name].obj;
        p.x = data[key].x;
        p.y = data[key].y;
        p.ok = false;
//        delete p.zOrder;
    }
    needRedraw = true;
};

var onDataLoadChunk = function(data){
//    var key, p;
    map.processLoadedChunk(data);
    
    //TODO: partial recalc for planes
    planeAll();
    view.calculateOffsetZ(map.newLocalX, map.newLocalY);
    map.recalcPoints();
    
    needRedraw = true;
    needRedrawTiles = true;
    //    _(data);
};

//-----------------------------------------------------------------------------
//
//                               SOCKET
//
//-----------------------------------------------------------------------------
var srv = {};

srv.connect = function(name, url){
    player.name = name;
    srv.ws = new WebSocket(url);
    srv.ws.onopen = srv.ws_onopen;
    srv.ws.onerror = srv.ws_onerror;
    srv.ws.onclose = srv.ws_onclose;
    srv.ws.onmessage = srv.ws_onmessage;
};

srv.send = function(action, params) {
    var request = {};

    request[action] = params || {};
    request = JSON.stringify(request);

    _('request:',request);
    srv.ws.send(request);
};

srv.ws_onopen = function(){
    srv.send('login', {name: player.name});
};

srv.ws_onerror = function(e){
    console.log('event: ', e);
};

srv.ws_onclose = function(){
};

srv.ws_onmessage = function(e){
    var data = JSON.parse(e.data);

    if('login' in data) onDataLogin(data.login);
    if('init' in data) onDataInit(data.init);
    if('map' in data) onDataMap(data.map);
//    if('hmap' in data) onDataHeightMap(data.hmap);
    if('entities' in data) onDataEntities(data.entities);
    if('objects' in data) onDataObjects(data.objects);
    if('players' in data) onDataPlayers(data.players);
    if('playerLeft' in data) onDataPlayerLeft(data.playerLeft);
    if('move' in data) onDataMove(data.move);
    if('movePlayers' in data) onDataMovePlayers(data.movePlayers);
    if('loadChunk' in data) onDataLoadChunk(data.loadChunk);
};