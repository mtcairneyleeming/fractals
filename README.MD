# Fractals

A program to create 3d developing fractals ([paper](https://doi.org/10.1080/17513472.2013.852399)) from Lindenmayer systems ([wikipedia](https://en.wikipedia.org/wiki/L-system?oldformat=true)).

## Modules
There are 4 major modules that make up this project

### L-systems parser
A simple parser for context-free, deterministic Lindenmayer systems.

### L-systems to SVG
Some code to draw an SVG from a L-system state.


### Straight-lines developing fractals
Given a mapping from the L-systems alphabet to 'turtle' drawing commands using (only) straight lines, this produces a developing fractal from the selected iterations. 

Support for 'windows' may come later


### Curved developing fractals
This module would allow any description of the alphabet to drawing mapping (incl. curves) and then produce a developing fractal, using one of the approaches in the paper linked above. This will definitely come later.