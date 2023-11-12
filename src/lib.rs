use std::cmp::Ordering;

use js_sys::JsString;
use levenshtein::levenshtein;
use wasm_bindgen::prelude::*;

#[derive(Debug)]
pub struct SearchResult {
    pub score: f32,
    pub index: usize,
}

impl PartialEq for SearchResult {
    fn eq(&self, other: &Self) -> bool {
        self.score == other.score
    }
}
impl Eq for SearchResult {}

impl Ord for SearchResult {
    fn cmp(&self, other: &Self) -> Ordering {
        self.score.partial_cmp(&other.score).unwrap_or(self.score.to_bits().cmp(&other.score.to_bits()))
    }
}

impl PartialOrd for SearchResult {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

fn push_sorted(vec: &mut Vec<SearchResult>, search_result: SearchResult) {
    let pos = vec.binary_search(&search_result).unwrap_or_else(|e| e);
    vec.insert(pos, search_result);
}

#[wasm_bindgen]
pub fn search(search_text: &str, titles: Vec<JsString>) -> Result<js_sys::Array, JsValue> {
    const MAX_RESULTS_LEV: usize = 100;
    const MAX_RESULTS_RETURN: usize = 10;
    const MAX_LEV_SCORE: f32 = 4.0;

    let results = js_sys::Array::new();

    let mut res: Vec<SearchResult> = vec![];
    
    let t_len = search_text.len() as f32;
    let search_text = search_text.to_ascii_lowercase();

    // Find 'contains' results only first:
    for (i, s) in titles.iter().enumerate() {
        match s.as_string() {
            Some(s) => {
                if s.to_ascii_lowercase().contains(&search_text) {
                    let s_len = s.len() as f32;
                    let score = 1.0 - if s_len > t_len { t_len / s_len } else { s_len / t_len };
                    push_sorted(&mut res, SearchResult{ score, index: i });
                }
            }
            None => continue
        };
    }

    // Use levenshtein if more results are needed:
    if res.len() < MAX_RESULTS_RETURN {
        for (idx, s) in titles.iter().enumerate() {
            match s.as_string() {
                Some(s) => {
                    let score = levenshtein(s.as_str(), &search_text) as f32;
                    if score <= MAX_LEV_SCORE {
                        let mut found = false;
                        for i in 0..usize::min(MAX_RESULTS_RETURN, res.len()) {
                            if res[i].index == idx {
                                found = true;
                                break;
                            }
                        }
                        if !found {
                            push_sorted(&mut res, SearchResult{ score, index: idx });
                            if res.len() >= MAX_RESULTS_LEV {
                                break;
                            }
                        }
                    }
                }
                None => continue
            };
        }
    }

    for i in 0..usize::min(MAX_RESULTS_RETURN, res.len()) {
        let r = &res[i];
        results.push(&JsValue::from(r.index));
    }

    Ok(results)
}
