use crate::geom::*;


// points in the direction of the smaller angle between a,b
fn angle_bisector(a: Line3d, b: Line3d) -> Point3d {
    // 2d versions of these two lines
    // direction vectors of each
    let va = a.start().sub(a.end());
    let vb = b.end().sub(b.start());
    // normed direction vectors
    let norm_a = va.unit();
    let norm_b = vb.unit();

    norm_a.add(norm_b).unit()
}

fn smallest_angle_between(a: Point3d, b: Point3d) -> f64 {
    if a.sub(b).norm() < 1e-9 {
        std::f64::consts::PI
    } else if a.add(b).norm() < 1e-9 {
        0.0
    } else {
        a.dot(b).acos()
    }
}
// only in x,y
fn rotate_vector(vec: Point3d, angle: f64) -> Point3d {
    let (s, c) = angle.sin_cos();
    Point3d::new(vec.x * c - vec.y * s, vec.x * s + vec.y * c, vec.z)
}

fn fix_lines<T>(lines: Vec<T>) -> Vec<T>
where
    T: Line + Copy,
{
    if lines.len() == 0 {
        return vec![];
    }
    let mut out_lines = vec![lines[0]];
    for i in 1..lines.len() {
        let last = *out_lines.last().unwrap();
        if last.is_parallel_to(lines[i]) && last.direction().add(lines[i].direction()).norm() > 1e-7 {
            let prev = out_lines.pop().unwrap();
            out_lines.push(prev.merge_with_parallel(lines[i]))
        } else {
            out_lines.push(lines[i])
        }
    }
    return out_lines;
}

fn curve_intersection(
    prev: Line3d,
    next: Line3d,
    max_curve_frac: f64,
    steps_multiplier: f64,
    return_next: bool,
) -> Vec<Line3d> {
    // important points
    let a = prev.start();
    let b = prev.end(); // = next.start
    let c = next.end();
    // direction vectors
    let pv = prev.direction();
    let nv = next.direction();

    const PI: f64 = std::f64::consts::PI;
    // angle between AB & BC
    let angle_between_lines = smallest_angle_between(pv, nv.scale(-1.0)) % PI;
    if angle_between_lines.abs() < 1e-7 || (angle_between_lines - PI).abs() < 1e-7 {
        return vec![if return_next { next } else { prev }];
    };
    let bisect_tangent_angle = (std::f64::consts::PI - angle_between_lines) / 2.0;
    let smaller_side_length = prev.length().min(next.length()) * max_curve_frac;

    // calculate the radius of a circle tangent to AB & BC that touches each
    // smaller_side_length away from B.
    let radius = smaller_side_length / bisect_tangent_angle.tan();
    // the distance from B to the centre of the circle
    let bisector_length = smaller_side_length / bisect_tangent_angle.sin();
    let centre = angle_bisector(prev, next).scale(bisector_length).add(b);

    let mut lines = vec![];

    // point at which the circle intersects the angle bisector
    let circle_bis_intersection = centre.add(b.sub(centre).unit().scale(radius));

    let (start_point, _theor_end_point) = if return_next {
        // i.e. want to go from the bisector to the tangent point with BC
        (
            circle_bis_intersection,
            next.point(smaller_side_length / next.length()),
        )
    } else {
        // i.e from the tangent point with AB to the bisector
        let start = prev.point(1.0 - smaller_side_length / prev.length());
        // Join A to the tangent point on AB (if they are not the same)
        if start.sub(a).norm() > 1e-8 {
            lines.push(Line3d::new(a, start));
        }
        (start, circle_bis_intersection)
    };
    // uses just the angle and the multiplier so that there are the same no. of
    // steps in the outside and inside of a thick line
    let mut steps = (bisect_tangent_angle * steps_multiplier).round() as i64;
    if steps == 0 {
        steps = 1
    }
    let mut prev_point = start_point;
    // direction vector from centre to start
    let init_vector = start_point.sub(centre);
    // to determine whether BC is a anti/clockwise turn from AB
    let perp_2d_prod = pv.x * nv.y - pv.y * nv.x;
    for i in 1..=steps {
        let curr_angle = bisect_tangent_angle * (i as f64) / (steps as f64);
        let new_point = centre.add(rotate_vector(
            init_vector,
            // rotate the right way (note that the =0.0 case is ignored since we tested for parallelness of
            // AB, BC earlier)
            if perp_2d_prod < 0.0 {
                -1.0 * curr_angle
            } else {
                curr_angle
            },
        ));
        lines.push(Line3d::new(prev_point, new_point));
        prev_point = new_point;
    }

    // Join tangent point to C (if not already there)
    if return_next && prev_point.sub(c).norm() > 1e-8 {
        lines.push(Line3d::new(prev_point, c));
    }
    lines
}

pub fn curve_line(
    line: Line3d,
    prev: Option<Line3d>,
    next: Option<Line3d>,
    max_curve_frac: f64,
    steps_multiplier: f64,
) -> Vec<Line3d> {
    if prev.is_some() && next.is_some() {
        // divide up the line according to the ratio of the angles
        let divided = (line.section(0.0, 0.5), line.section(0.5, 1.0));
        let mut starts = curve_intersection(
            prev.unwrap().section(0.5, 1.0),
            divided.0,
            max_curve_frac / 0.5,
            steps_multiplier,
            true,
        );

        let mut ends = curve_intersection(
            divided.1,
            next.unwrap().section(0.0, 0.5),
            max_curve_frac / (1.0 - 0.5),
            steps_multiplier,
            false,
        );
        starts.append(&mut ends);
        starts
    } else if prev.is_some() {
        curve_intersection(prev.unwrap(), line, max_curve_frac, steps_multiplier, true)
    } else if next.is_some() {
        curve_intersection(line, next.unwrap(), max_curve_frac, steps_multiplier, false)
    } else {
        vec![line]
    }
}

fn curve_layer<T>(layer: Layer<T>, max_curve_frac: f64, steps_multiplier: f64) -> Layer<T>
where
    T: Line + Copy,
{
    let mut new_lines = vec![];

    match layer.count() {
        0 => panic!("Cannot curve an empty layer"),
        1 => {
            new_lines.extend(layer.first().curve(None, None, max_curve_frac, steps_multiplier));
        }
        _ => {
            let len = layer.count();
            let lines = layer.lines();
            new_lines.extend(
                layer
                    .first()
                    .curve(None, Some(lines[1]), max_curve_frac, steps_multiplier),
            );
            for i in 1..len - 1 {
                new_lines.extend(lines[i].curve(
                    Some(lines[i - 1]),
                    Some(lines[i + 1]),
                    max_curve_frac,
                    steps_multiplier,
                ));
            }
            new_lines.extend(lines[len - 1].curve(
                Some(lines[len - 2]),
                None,
                max_curve_frac,
                steps_multiplier,
            ));
        }
    };
    let fixed_lines = fix_lines(new_lines);
    Layer::<T>::new(fixed_lines)
}

pub fn curve_layers<T>(in_layers: Vec<Layer<T>>, max_curve_frac: f64, steps_multiplier: f64) -> Vec<Layer<T>>
where
    T: Line + Copy,
{
    let mut curved_layers: Vec<Layer<T>> = vec![];


    for layer in in_layers {
        curved_layers.push(curve_layer(layer, max_curve_frac, steps_multiplier));
    }
    return curved_layers;
}
