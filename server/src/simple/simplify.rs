use crate::geom::*;

pub fn simplify(layers: Vec<Layer<Line3d>>) -> Vec<Layer<Line3d>> {
    let mut out = vec![];
    for old_layer in layers {
        let mut layer = vec![old_layer.lines[0]];
        for line in old_layer.lines.iter().skip(1) {
            old_len += line.length();
            let prev = layer.last().unwrap();
            if prev.is_parallel_to(*line) && prev.direction().add(line.direction()).norm() > 1e-7 {
                i += 1;
                let new_line = Line3d::new(prev.start(), line.end());
                layer.push(new_line)
            } else {
                layer.push(*line);
            }
        }
        out.push(Layer::<Line3d> { lines: layer });
    }
    out
}
