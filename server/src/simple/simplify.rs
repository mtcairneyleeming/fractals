use crate::geom::*;

// F=>-GF+F++F-G-F
// G=>+FG-G--G+F+G

pub fn simplify(layers: Vec<Layer<Line3d>>) -> Vec<Layer<Line3d>> {
    let mut out = vec![];
    for old_layer in layers {
        let mut new_layer = vec![old_layer.first()];
        for line in old_layer.lines().iter().skip(1) {
            let prev = new_layer.last().unwrap();
            if prev.is_parallel_to(*line) && prev.direction().add(line.direction()).norm() > 1e-7 {
                let new_line = Line3d::new(prev.start(), line.end());
                new_layer.pop();
                new_layer.push(new_line)
            } else {
                new_layer.push(*line);
            }
        }
        out.push(Layer::<Line3d>::new(new_layer));
    }
    out
}
