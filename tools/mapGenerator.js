var MAP_SIZE = 100;

generateMap = function(){
    var l, i, tiles = [];
    for(l = MAP_SIZE; l--;){
        tiles[l] = [];
        for(i = MAP_SIZE; i--;){
            tiles[l][i] = Math.floor(Math.random() * 4);
        }
    }
    return tiles;
};