# Fractals

A website for designing fractals and turning them into 3d printable models.

It's based on the idea of a developing fractal from ([this paper](https://doi.org/10.1080/17513472.2013.852399)), and `server` contains all the geometry code needed to implement and run this successfully, for a subset of fractals that you can generate with Lindenmayer systems (on [wikipedia](https://en.wikipedia.org/wiki/L-system)) that contain only straight lines.

`web` contains the frontend, which has the UI to actually design the fractal, and to preview it too, with a large amount of help text also included. 

The generated developing fractals can have smooth curves on their corners, as well as 'windows' to speed print time by making the models lighter.

## Build/setup

To develop, you can use `cargo run` in the server directory and `parcel watch web/index.html` in the web directory, and the `update.sh` script will download changes and rebuild everything for production use. I've used caddy to setup HTTPS. Note that the rust server also serves the compiled files for the front end.
