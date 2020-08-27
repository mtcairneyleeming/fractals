use super::util::*;
use crate::geom::*;

fn divide_line(line: Line2d, frac: f64) -> (Line2d, Line2d) {
    let point = line.point(frac);
    (Line2d::new(line.start, point), Line2d::new(point, line.end))
}
// points in the direction of the smaller angle between a,b
fn angle_bisector2(a: Line2d, b: Line2d) -> Point2d {
    // 2d versions of these two lines
    // direction vectors of each
    let va = a.start.sub(a.end);
    let vb = b.end.sub(b.start);
    // normed direction vectors
    let norm_a = va.unit();
    let norm_b = vb.unit();

    norm_a.add(norm_b).unit()
}

fn smallest_angle_between(a: Point2d, b: Point2d) -> f64 {
    if a.sub(b).norm() < EPS {
        0.0
    } else {
        a.dot(b).acos()
    }
}

fn rotate_vector(vec: Point2d, angle: f64) -> Point2d {
    let (s, c) = angle.sin_cos();
    Point2d::new(vec.x * c - vec.y * s, vec.x * s + vec.y * c)
}

fn fix_lines(lines: Vec<Line2d>) -> Vec<Line2d> {
    if lines.len() == 0 {
        return vec![];
    }
    let mut out_lines = vec![lines[0]];
    for i in 1..lines.len() {
        if are_parallel2(*out_lines.last().unwrap(), lines[i]) {
            let prev = out_lines.pop().unwrap();
            out_lines.push(Line2d::new(prev.start, lines[i].end))
        } else {
            out_lines.push(lines[i])
        }
    }
    return out_lines;
}

fn curve_intersection(
    prev: Line2d,
    next: Line2d,
    max_curve_frac: f64,
    steps_multiplier: f64,
    return_next: bool,
) -> Vec<Line2d> {
    // important points
    let a = prev.start;
    let b = prev.end; // = next.start
    let c = next.end;
    // direction vectors
    let pv = prev.direction();
    let nv = next.direction();

    const PI: f64 = std::f64::consts::PI;
    // angle between AB & BC
    let angle_between_lines = smallest_angle_between(pv, nv.scale(-1.0)) % PI;
    if angle_between_lines.abs() < 1e-7 || (angle_between_lines - PI).abs() < 1e-7 {
        // i.e. parallel
        return vec![if return_next { next } else { prev }];
    }
    let bisect_tangent_angle = (std::f64::consts::PI - angle_between_lines) / 2.0;
    let smaller_side_length = prev.length.min(next.length) * max_curve_frac;

    // calculate the radius of a circle tangent to AB & BC that touches each
    // smaller_side_length away from B.
    let radius = smaller_side_length / bisect_tangent_angle.tan();
    // the distance from B to the centre of the circle
    let bisector_length = smaller_side_length / bisect_tangent_angle.sin();
    let centre = angle_bisector2(prev, next).scale(bisector_length).add(b);

    let mut lines = vec![];

    // point at which the circle intersects the angle bisector
    let circle_bis_intersection = centre.add(b.sub(centre).unit().scale(radius));

    let (start_point, _theor_end_point) = if return_next {
        // i.e. want to go from the bisector to the tangent point with BC
        (
            circle_bis_intersection,
            next.point(smaller_side_length / next.length),
        )
    } else {
        // i.e from the tangent point with AB to the bisector
        let start = prev.point(1.0 - smaller_side_length / prev.length);
        // Join A to the tangent point on AB (if they are not the same)
        if start.sub(a).norm() > 1e-8 {
            lines.push(Line2d::new(a, start));
        }
        (start, circle_bis_intersection)
    };
    // uses arc length (= radius * angle) and the user-configurable multiplier
    let mut steps = (bisect_tangent_angle * radius * steps_multiplier).round() as i64;
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
        lines.push(Line2d::new(prev_point, new_point));
        prev_point = new_point;
    }

    // Join tangent point to C (if not already there)
    if return_next && prev_point.sub(c).norm() > 1e-8 {
        lines.push(Line2d::new(prev_point, c));
    }
    lines
}

fn curve_line(
    line: Line2d,
    prev: Option<Line2d>,
    next: Option<Line2d>,
    max_curve_frac: f64,
    steps_multiplier: f64,
) -> Vec<Line2d> {
    if prev.is_some() && next.is_some() {
        // divide up the line according to the ratio of the angles
        let divided = divide_line(line, 0.5);
        let mut starts = curve_intersection(
            prev.unwrap(),
            divided.0,
            max_curve_frac / 0.5,
            steps_multiplier,
            true,
        );

        let mut ends = curve_intersection(
            divided.1,
            next.unwrap(),
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

fn curve_layer(segment: Segment, max_curve_frac: f64, steps_multiplier: f64) -> Segment {
    let mut new_lines = vec![];

    let start = match segment.lines.len() {
        0 => panic!("Cannot curve an empty layer"),
        1 => {
            new_lines.extend(curve_line(
                segment.lines[0].to2d(),
                None,
                None,
                max_curve_frac,
                steps_multiplier,
            ));
            Point3d::from2d(new_lines[0].start, segment.lines[0].start.z)
        }
        _ => {
            let len = segment.lines.len();
            new_lines.extend(curve_line(
                segment.lines[0].to2d(),
                None,
                Some(segment.lines[1].to2d()),
                max_curve_frac,
                steps_multiplier,
            ));
            for i in 1..len - 1 {
                new_lines.extend(curve_line(
                    segment.lines[i].to2d(),
                    Some(segment.lines[i - 1].to2d()),
                    Some(segment.lines[i + 1].to2d()),
                    max_curve_frac,
                    steps_multiplier,
                ));
            }
            new_lines.extend(curve_line(
                segment.lines[len - 1].to2d(),
                Some(segment.lines[len - 2].to2d()),
                None,
                max_curve_frac,
                steps_multiplier,
            ));
            Point3d::from2d(new_lines[0].start, segment.lines[0].start.z)
        }
    };
    let fixed_lines = fix_lines(new_lines);
    Segment {
        lines: fixed_lines
            .into_iter()
            .map(|l| Line3d::from2d(l, start.z))
            .collect(),
    }
}

pub fn curve_layers(in_layers: Vec<Segment>, max_curve_frac: f64, steps_multiplier: f64) -> Vec<Segment> {
    let mut curved_layers: Vec<Segment> = vec![];


    for layer in in_layers {
        curved_layers.push(curve_layer(layer, max_curve_frac, steps_multiplier));
    }
    return curved_layers;
}
