use super::line::*;

pub struct Layer<T>
where
    T: Line + Copy,
{
    pub lines: Vec<T>,
}

impl<T> Layer<T>
where
    T: Line + Copy,
{
    pub fn new(lines: Vec<T>) -> Self {
        Self { lines }
    }
    pub fn length(&self) -> f64 {
        let mut length = 0.0;
        for line in &self.lines {
            length += line.length();
        }
        length
    }
    pub fn count(&self) -> usize {
        self.lines.len()
    }
    pub fn first(&self) -> T {
        self.lines[0]
    }
    pub fn last(&self) -> T {
        self.lines[self.count() - 1]
    }

    pub fn get_section(&self, start: f64, end: f64) -> Vec<T> {
        return if self.count() == 0 {
            panic!("Cannot get section of empty layer");
        } else {
            let mut out: Vec<T> = Vec::new();
            let mut curr_frac: f64 = 0.0;
            let ov_length = self.length();
            for line in self.lines.as_slice() {
                let line_frac = line.length() / ov_length;
                let line_start = curr_frac;
                let line_end = curr_frac + line_frac;
                if end >= line_start && start <= line_end {
                    out.push(line.section((start - line_start) / line_frac, (end - line_start) / line_frac));
                }
                curr_frac += line_frac
            }
            out
        };
    }
}

impl Layer<Line3d> {
    pub(crate) fn thicken(&self, offset: f64) -> Layer<ThickLine3d> {
        let mut lines = vec![];
        // input
        let orig_lines = &self.lines;

        match orig_lines.len() {
            0 => panic!("Failure: cannot thicken an empty layer."),
            1 => {
                lines.push(orig_lines[0].thicken(offset, None, None));
            }
            _ => {
                // sort out first
                lines.push(orig_lines[0].thicken(offset, None, Some(orig_lines[1])));

                // do middle ones
                for i in 1..orig_lines.len() - 1 {
                    lines.push(orig_lines[i].thicken(
                        offset,
                        Some(orig_lines[i - 1]),
                        Some(orig_lines[i + 1]),
                    ));
                }
                // sort out last
                let last = orig_lines.len() - 1;
                lines.push(orig_lines[last].thicken(offset, Some(orig_lines[last - 1]), None));
            }
        };

        return Layer::<ThickLine3d>::new(lines);
    }
}
