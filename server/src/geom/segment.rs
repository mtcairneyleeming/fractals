use super::offset::*;
use super::threed::*;
use serde::Deserialize;

#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Segment {
    pub(crate) lines: Vec<Line3d>,
}

impl Segment {
    pub(crate) fn length(&self) -> f64 {
        let mut length = 0.0;
        for line in self.lines.as_slice() {
            length += line.length;
        }
        length
    }

    pub(crate) fn get_section(&self, start: f64, end: f64) -> Vec<Line3d> {
        return if self.lines.len() == 0 {
            panic!("Cannot get section of empty layer");
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
#[derive(Debug)]
pub struct ThickSegment {
    pub(crate) orig_lines: Vec<Line3d>,
    pub(crate) inner_lines: Vec<Line3d>,
    pub(crate) outer_lines: Vec<Line3d>,
    pub(crate) orig_length: f64,
}

impl ThickSegment {
    /// Thickens a `Segment` by `offset`, taking into account any lines that
    /// might come before or after the segment There are exactly as many
    /// lines in `orig_lines` as in `inner_lines` and `outer_lines`, and
    /// this method panics if no lines are provided and no context either,
    /// or if the `Segment` is not on a plane and contiguous.
    pub(crate) fn thicken(original: Segment, offset: f64) -> ThickSegment {
        // input
        let orig_lines = original.lines.clone();
        // output
        let mut outer_lines = vec![];
        let mut inner_lines = vec![];

        match orig_lines.len() {
            0 => panic!("Failure: cannot thicken an empty layer."),
            1 => {
                outer_lines.push(offset_line(orig_lines[0], None, None, offset));
                inner_lines.push(offset_line(orig_lines[0], None, None, -offset));
            }
            _ => {
                // sort out first
                outer_lines.push(offset_line(orig_lines[0], None, Some(orig_lines[1]), offset));

                inner_lines.push(offset_line(orig_lines[0], None, Some(orig_lines[1]), -offset));
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
                    None,
                    offset,
                ));
                inner_lines.push(offset_line(
                    orig_lines[orig_lines.len() - 1],
                    Some(orig_lines[orig_lines.len() - 2]),
                    None,
                    -offset,
                ));
            }
        };

        return ThickSegment {
            orig_lines,
            inner_lines,
            outer_lines,
            orig_length: original.length(),
        };
    }


    /// Given a fraction into the `orig_lines` of this `ThickSegment`, it
    /// returns that section of the `orig_lines` plus the corresponding
    /// inner and outer lines, taking the same fraction of each outer/inner line
    /// as the corresponding original line.
    pub(crate) fn get_section(&self, start: f64, end: f64) -> (Vec<Line3d>, Vec<Line3d>, Vec<Line3d>) {
        // note there are the same number of lines for either
        return if self.outer_lines.len() == 0 {
            panic!("Cannot get section of empty (thickened layer");
        } else {
            let mut orig = vec![];
            let mut inner = vec![];
            let mut outer = vec![];
            let mut curr_frac: f64 = 0.0;

            let tot_length = self.orig_length;

            for i in 0..self.orig_lines.len() {
                let line_frac = self.orig_lines[i].length / tot_length;

                if end >= curr_frac
                    && start <= curr_frac + line_frac
                    && (start - curr_frac) / line_frac < 1.0 - 1e-7
                    && (end - curr_frac) / line_frac > 1e-7
                {
                    orig.push(
                        self.orig_lines[i]
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
