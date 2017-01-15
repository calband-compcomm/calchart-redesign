var path = require("path");

module.exports = function (grunt) {
    grunt.loadNpmTasks("grunt-webpack");
    grunt.loadNpmTasks("grunt-contrib-sass");
    grunt.loadNpmTasks("grunt-contrib-watch");

    grunt.initConfig({
        webpack: {
            build: {
                entry: {
                    editor: "./calchart/static/src/editor.js",
                },
                output: {
                    path: "calchart/static/js/",
                    filename: "[name].js",
                },
                // set import paths relative to src/ directory
                resolve: {
                    root: [
                        path.resolve("./calchart/static/src")
                    ],
                },
                module: {
                    loaders: [
                        // convert ES6 to ES5
                        {
                            test: /\.js$/,
                            exclude: "node_modules",
                            loader: "babel-loader",
                            query: {
                                presets: ["es2015"],
                                plugins: [
                                    ["babel-plugin-transform-builtin-extend", {
                                        globals: ["Error"],
                                    }],
                                ],
                                minified: true,
                                comments: false,
                                cacheDirectory: true,
                            },
                        },
                        // add jQuery to namespace when loading chosen-js
                        // http://reactkungfu.com/2015/10/integrating-jquery-chosen-with-webpack-using-imports-loader/
                        {
                            test: /chosen\.jquery\.js$/,
                            loader: "imports?jQuery=jquery,$=jquery,this=>window",
                        },
                    ],
                },
                // emit source maps
                devtool: "source-map",
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
                files: ["calchart/static/src/**/*.js"],
                tasks: "webpack:build",
            },
        },
    });

    grunt.registerTask("build", ["sass", "webpack:build"]);
    grunt.registerTask("default", ["build", "watch"]);
};
