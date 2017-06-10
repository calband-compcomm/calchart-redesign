var path = require("path");
var eslint = require("eslint");

var entryPoints = {};
var entryFiles = ["home", "editor", "viewer", "viewpsheet", "wiki"].map(function(file) {
    var filepath = "./src/" + file + ".js";
    entryPoints[file] = filepath;
    return filepath;
});

module.exports = function(grunt) {
    grunt.loadNpmTasks("grunt-webpack");
    grunt.loadNpmTasks("grunt-contrib-sass");
    grunt.loadNpmTasks("grunt-contrib-watch");

    grunt.initConfig({
        webpack: {
            build: {
                entry: entryPoints,
                output: {
                    path: path.resolve("calchart/static/js/"),
                    filename: "[name].js",
                },
                resolve: {
                    modules: [
                        // set import paths relative to src/ directory
                        path.resolve("./src"),
                        // needed for babel-runtime
                        path.resolve("./node_modules"),
                    ],
                },
                module: {
                    rules: [
                        {
                            test: /\.js$/,
                            exclude: /node_modules/,
                            use: {
                                loader: "babel-loader",
                                options: {
                                    presets: [
                                        // converts ES6 to ES5: http://javascriptplayground.com/blog/2016/10/moving-to-webpack-2/#stop-babel-from-compiling-es2015-modules
                                        ["es2015", {
                                            modules: false,
                                        }],
                                    ],
                                    // TODO: uncomment after https://github.com/webpack-contrib/grunt-webpack/pull/141
                                    plugins: [
                                        // // allows ES6 primitives such as Set
                                        // "babel-plugin-transform-runtime",
                                        // // allows correct behavior for `extends Error`
                                        // ["babel-plugin-transform-builtin-extend", {
                                        //     globals: ["Error"],
                                        // }],
                                    ],
                                    minified: true,
                                    comments: false,
                                    // faster compilation
                                    cacheDirectory: true,
                                },
                            },
                        },
                    ],
                },
                // emit source maps
                devtool: "source-map",
                // control output
                stats: "normal",
            },
        },
        sass: {
            dist: {
                options: {
                    style: "compressed",
                },
                files: [{
                    expand: true,
                    cwd: "calchart/static/sass",
                    src: "**/*.scss",
                    dest: "calchart/static/css",
                    ext: ".css",
                }],
            },
        },
        watch: {
            sass: {
                files: "calchart/static/sass/**/*.scss",
                tasks: "sass",
            },
            js: {
                files: ["src/**/*.js"],
                tasks: "webpack:build",
            },
        },
    });

    grunt.registerTask("build", ["sass", "webpack:build"]);
    grunt.registerTask("default", ["build", "watch"]);

    // our custom task for linting
    grunt.registerTask("lint", "Run the ESLint linter.", function() {
        var engine = new eslint.CLIEngine();
        var report = engine.executeOnFiles(["src/"]);
        var formatter = engine.getFormatter();
        var output = formatter(report.results);

        if (report.errorCount + report.warningCount > 0) {
            grunt.log.writeln(output);
            grunt.fail.warn("Linting failed.");
        } else {
            grunt.log.writeln("No linting errors.");
        }
    });
};
