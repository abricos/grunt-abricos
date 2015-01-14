var path = require('path');
var spawn = require('child_process').spawn;

module.exports = function(config){

    var haraka = null;
    var api = {};

    api.start = function(){
        if (haraka) return; // already started

        var progDir = config.get('haraka.prog.dir'),
            prog = path.join(progDir, 'haraka'),
            harakaConfigDir = config.get('haraka.config.dir');

        config.logger().debug('starting Haraka: ' + prog);
        config.logger().debug('Haraka config: ' + harakaConfigDir);

        haraka = spawn(prog, ['-c', harakaConfigDir]);

        haraka.on('exit', function(code){
            config.logger().warn('haraka server exited with code ' + code + '. respawning');
            haraka = null;
            return api.start();
        });

        haraka.on('error', function(err){
            config.logger().error('error spawning haraka server: ' + err.message);
            haraka = null;
        });

        // pipe stdout/stderr to parent process
        haraka.stdout.pipe(process.stdout);
        haraka.stderr.pipe(process.stderr);
    }

    api.stop = function(){
        if (!haraka) return; // already stopped
        config.logger().debug('stoping Haraka');

        haraka.removeAllListeners('exit');
        haraka.removeAllListeners('error');
        haraka.kill();
    };

    return api;
};
