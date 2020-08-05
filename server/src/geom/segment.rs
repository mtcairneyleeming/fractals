use super::offset::*;
use super::threed::*;
use serde::Deserialize;

#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Segment {
    pub(crate) symbol: String,
    pub(crate) lines: Vec<Line3d>,
    pub(crate) start: Point3d,
    pub(crate) prev_index: usize,
}

impl Segment {
    pub fn end(&self) -> Point3d {
        return match self.lines.last() {
            Some(line) => line.end,
            None => self.start,
        };
    }

    pub(crate) fn length(&self) -> f64 {
        let mut length = 0.0;
        for line in self.lines.as_slice() {
            length += line.length;
        }
        length
    }

    pub(crate) fn get_section(&self, start: f64, end: f64) -> Vec<Line3d> {
        return if self.lines.len() == 0 {
            vec![Line3d::new(self.start, self.start)]
        } else {
            let mut out: Vec<Line3d> = Vec::new();
            let mut curr_frac: f64 = 0.0;
            let ov_length = self.length();
            for line in self.lines.as_slice() {
                let line_frac = line.length / ov_length;
                let line_start = curr_frac;
                let line_end = curr_frac + line_frac;
                if end >= line_start && start <= line_end {
                    out.push(
                        line.get_section((start - line_start) / line_frac, (end - line_start) / line_frac),
                    );
                }
                curr_frac += line_frac
            }
            out
        };
    }
}

pub struct ThickSegment {
    pub(crate) original: Segment,
    pub(crate) inner_start: Point3d,
    pub(crate) outer_start: Point3d,
    pub(crate) inner_lines: Vec<Line3d>,
    pub(crate) outer_lines: Vec<Line3d>,
}

impl ThickSegment {
    /// Thickens a `Segment` by `offset`, taking into account any lines that might come before or after the segment
    /// There are exactly as many lines in `original.lines` as in `inner_lines` and `outer_lines`, and this method panics if
    /// no lines are provided and no context either, or if the `Segment` is not on a plane and contiguous.
    pub(crate) fn thicken(
        original: Segment,
        offset: f64,
        prev_line: Option<Line3d>,
        next_line: Option<Line3d>,
    ) -> ThickSegment {
        // input
        let orig_lines = original.lines.clone();
        // output
        let mut outer_lines = vec![];
        let mut inner_lines = vec![];

        let (outer_start, inner_start) = match orig_lines.len() {
            0 => {
                if prev_line.is_none() && next_line.is_none() {
                    panic!("Failure: cannot thicken a point in 3d space, since previous & next lines were None, and this segment (symbol {}, prevIndex {}) had no lines.", original.symbol, original.prev_index)
                } else if prev_line.is_none() {
                    (
                        offset_line_endpoint(next_line.unwrap(), offset, true),
                        offset_line_endpoint(next_line.unwrap(), -offset, true),
                    )
                } else if next_line.is_none() {
                    (
                        offset_line_endpoint(prev_line.unwrap(), offset, false),
                        offset_line_endpoint(prev_line.unwrap(), -offset, false),
                    )
                } else {
                    (
                        offset_intersection(prev_line.unwrap(), next_line.unwrap(), offset),
                        offset_intersection(prev_line.unwrap(), next_line.unwrap(), -offset),
                    )
                }
            }
            1 => {
                outer_lines.push(offset_line(orig_lines[0], prev_line, next_line, offset));
                inner_lines.push(offset_line(orig_lines[0], prev_line, next_line, -offset));
                (outer_lines[0].start, inner_lines[0].start)
            }
            _ => {
                // sort out first
                outer_lines.push(offset_line(orig_lines[0], prev_line, Some(orig_lines[1]), offset));

                inner_lines.push(offset_line(
                    orig_lines[0],
                    prev_line,
                    Some(orig_lines[1]),
                    -offset,
                ));
                // do middle ones
                for i in 1..orig_lines.len() - 1 {
                    outer_lines.push(offset_line(
                        orig_lines[i],
                        Some(orig_lines[i - 1]),
                        Some(orig_lines[i + 1]),
                        offset,
                    ));
                    inner_lines.push(offset_line(
                        orig_lines[i],
                        Some(orig_lines[i - 1]),
                        Some(orig_lines[i + 1]),
                        -offset,
                    ))
                }
                // sort out last
                outer_lines.push(offset_line(
                    orig_lines[orig_lines.len() - 1],
                    Some(orig_lines[orig_lines.len() - 2]),
                    next_line,
                    offset,
                ));
                inner_lines.push(offset_line(
                    orig_lines[orig_lines.len() - 1],
                    Some(orig_lines[orig_lines.len() - 2]),
                    next_line,
                    -offset,
                ));
                (outer_lines[0].start, inner_lines[0].start)
            }
        };

        return ThickSegment {
            original,
            inner_lines,
            inner_start,
            outer_start,
            outer_lines,
        };
    }

    pub(crate) fn outer_end(&self) -> Point3d {
        return self.outer_lines.last().map(|l| l.end).unwrap_or(self.outer_start);
    }

    pub(crate) fn inner_end(&self) -> Point3d {
        return self.inner_lines.last().map(|l| l.end).unwrap_or(self.inner_start);
    }

    /// Given a fraction into the `original.lines` of this `ThickSegment`, it returns that section of the `original.lines` plus the corresponding inner and outer lines, taking the same fraction of each outer/inner line as the corresponding original line.
    pub(crate) fn get_section(&self, start: f64, end: f64) -> (Vec<Line3d>, Vec<Line3d>, Vec<Line3d>) {
        // note there are the same number of lines for either
        return if self.outer_lines.len() == 0 {
            (
                vec![Line3d::new(self.original.start, self.original.start)],
                vec![Line3d::new(self.inner_start, self.inner_start)],
                vec![Line3d::new(self.outer_start, self.outer_start)],
            )
        } else {
            let mut orig = vec![];
            let mut inner = vec![];
            let mut outer = vec![];
            let mut curr_frac: f64 = 0.0;

            let tot_length = self.original.length();

            for i in 0..self.original.lines.len() {
                let line_frac = self.original.lines[i].length / tot_length;

                if end >= curr_frac && start <= curr_frac + line_frac {
                    orig.push(
                        self.original.lines[i]
                            .get_section((start - curr_frac) / line_frac, (end - curr_frac) / line_frac),
                    );
                    inner.push(
                        self.inner_lines[i]
                            .get_section((start - curr_frac) / line_frac, (end - curr_frac) / line_frac),
                    );

                    outer.push(
                        self.outer_lines[i]
                            .get_section((start - curr_frac) / line_frac, (end - curr_frac) / line_frac),
                    )
                }
                curr_frac += line_frac
            }
            (orig, inner, outer)
        };
    }
}
