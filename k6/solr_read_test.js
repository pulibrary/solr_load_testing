// k6 port of solr_test_plan.jmx (Solr catalog read test).
//
// Each iteration sends the "Single Keyword Request" (fixed keyword) and then the
// "Multiple Keyword Request" (next keyword from keywords.csv, shared across all VUs),
// matching the enabled samplers in the JMeter plan. The JMeter "Sitemap Request" is
// disabled there and is not ported.
//
// Settings come from environment variables, e.g.
//   k6 run -e HOST=localhost -e PORT=8983 -e VUS=10 k6/solr_read_test.js
import http from 'k6/http';
import { check } from 'k6';
import exec from 'k6/execution';
import { SharedArray } from 'k6/data';

const HOST = __ENV.HOST || 'lib-solr9-staging.princeton.edu';
const PORT = __ENV.PORT || '8983';
const SOLR_CORE = __ENV.SOLR_CORE || 'catalog-performance';
const SINGLE_KEYWORD = __ENV.SINGLE_KEYWORD || 'calculus';
// Optional numFound check for the single keyword request (12941 for "calculus" on staging).
const KW_EXPECTED_RESULT_COUNT = __ENV.KW_EXPECTED_RESULT_COUNT;
const KEYWORD_FILE = __ENV.KEYWORD_FILE || '../keywords.csv';

const keywords = new SharedArray('keywords', () =>
  open(KEYWORD_FILE)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
);

export const options = {
  scenarios: {
    read: {
      executor: 'per-vu-iterations',
      vus: Number(__ENV.VUS || 200),
      iterations: Number(__ENV.ITERATIONS || 1000),
      maxDuration: __ENV.MAX_DURATION || '2h',
    },
  },
};

// Same parameters as the JMeter samplers, apart from q.
const SEARCH_PARAMS = [
  ['defType', 'edismax'],
  ['wt', 'json'],
  ['stats', 'true'],
  ['rows', '20'],
  ['sort', 'score desc, pub_date_start_sort desc, title_sort asc'],
  ['facet', 'true'],
  ['stats.field', 'pub_date_start_sort'],
  ['f.access_facet.facet.sort', 'index'],
  ['f.format.facet.limit', '16'],
  ['f.format.facet.mincount', '1'],
  ['f.format.facet.sort', 'index'],
  ['f.genre_facet.facet.limit', '11'],
  ['f.instrumentation_facet.facet.limit', '11'],
  ['f.language_facet.facet.limit', '11'],
  ['f.location.facet.limit', '21'],
  ['f.location.facet.mincount', '1'],
  ['f.location.facet.sort', 'index'],
  ['f.publication_place_facet.facet.limit', '11'],
  ['f.subject_era_facet.facet.limit', '11'],
  ['f.subject_topic_facet.facet.limit', '11'],
  ['f.sudoc_facet.facet.limit', '11'],
  ['f.sudoc_facet.facet.sort', 'index'],
  ['facet.field', 'access_facet'],
  ['facet.field', 'format'],
  ['facet.field', 'genre_facet'],
  ['facet.field', 'instrumentation_facet'],
  ['facet.field', 'language_facet'],
  ['facet.field', 'location'],
  ['facet.field', 'publication_place_facet'],
  ['facet.field', 'subject_era_facet'],
  ['facet.field', 'subject_facet'],
  ['facet.field', 'subject_topic_facet'],
  ['facet.field', 'sudoc_facet'],
  ['facet.field', '{!ex=pub_date_start_sort_single}pub_date_start_sort'],
  ['facet.pivot', 'lc_1letter_facet,lc_rest_facet'],
  ['facet.query', 'cataloged_tdt:[NOW/DAY-14DAYS TO NOW/DAY+1DAY]'],
  ['facet.query', 'cataloged_tdt:[NOW/DAY-1MONTH TO NOW/DAY+1DAY]'],
  ['facet.query', 'cataloged_tdt:[NOW/DAY-21DAYS TO NOW/DAY+1DAY]'],
  ['facet.query', 'cataloged_tdt:[NOW/DAY-2MONTHS TO NOW/DAY+1DAY]'],
  ['facet.query', 'cataloged_tdt:[NOW/DAY-3MONTHS TO NOW/DAY+1DAY]'],
  ['facet.query', 'cataloged_tdt:[NOW/DAY-6MONTHS TO NOW/DAY+1DAY]'],
  ['facet.query', 'cataloged_tdt:[NOW/DAY-7DAYS TO NOW/DAY+1DAY]'],
  ['facet.query', 'pub_date_start_sort:[1100 TO 1199]'],
  ['facet.query', 'pub_date_start_sort:[1200 TO 1299]'],
  ['facet.query', 'pub_date_start_sort:[1300 TO 1399]'],
  ['facet.query', 'pub_date_start_sort:[1400 TO 1499]'],
  ['facet.query', 'pub_date_start_sort:[1500 TO 1599]'],
  ['facet.query', 'pub_date_start_sort:[1600 TO 1699]'],
  ['facet.query', 'pub_date_start_sort:[1700 TO 1799]'],
  ['facet.query', 'pub_date_start_sort:[1800 TO 1899]'],
  ['facet.query', 'pub_date_start_sort:[1900 TO 1999]'],
  ['facet.query', 'pub_date_start_sort:[2000 TO 2024]'],
];

function searchUrl(keyword) {
  const query = [['q', keyword], ...SEARCH_PARAMS]
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return `http://${HOST}:${PORT}/solr/${SOLR_CORE}/select?${query}`;
}

function solrStatus(res) {
  try {
    return res.json('responseHeader.status');
  } catch (e) {
    return undefined;
  }
}

export default function () {
  const single = http.get(searchUrl(SINGLE_KEYWORD), {
    tags: { name: 'Single Keyword Request' },
  });
  const singleChecks = {
    'solr status is 0': (r) => solrStatus(r) === 0,
  };
  if (KW_EXPECTED_RESULT_COUNT) {
    singleChecks['result count matches'] = (r) =>
      String(r.json('response.numFound')) === KW_EXPECTED_RESULT_COUNT;
  }
  check(single, singleChecks, { request: 'Single Keyword Request' });

  const keyword = keywords[exec.scenario.iterationInTest % keywords.length];
  const multiple = http.get(searchUrl(keyword), {
    tags: { name: 'Multiple Keyword Request' },
  });
  check(
    multiple,
    { 'solr status is 0': (r) => solrStatus(r) === 0 },
    { request: 'Multiple Keyword Request' }
  );
}
