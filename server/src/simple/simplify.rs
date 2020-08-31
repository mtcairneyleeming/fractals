use crate::geom::*;

pub fn simplify(layers: Vec<Layer<Line3d>>) -> Vec<Layer<Line3d>> {
    let mut out = vec![];
    for old_layer in layers {
        let mut layer = vec![old_layer.lines[0]];
        for i in 1..old_layer.lines.len() {
            if old_layer.lines[i].is_parallel_to(*layer.last().unwrap()) {
                let prev = layer.pop().unwrap();
                layer.push(Line3d::new(prev.start(), old_layer.lines[i].end()))
            } else {
                layer.push(old_layer.lines[i])
            }
        }
        out.push(Layer::<Line3d> { lines: layer });
    }
    out
}
