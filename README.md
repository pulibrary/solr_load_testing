# Solr load testing

## Instructions for developing tests

1. `devbox shell`
1. Start jmeter - this will open the GUI, which should only be used when
   building or editing tests, not when actually load testing.

```bash
jmeter
```

1. From the GUI, select File > Open then browse to the test plan you want to
   work on (.e.g. `solr_test_plan.jmx`)
1. You may need to press the "plus" buttons to the left of the headers to see
   the full plan.
1. Go to the User Defined Variables under the top-level "Solr test plan" and
   make sure the variables match the environment you want to work against (see
   [User Defined Variables by Environment below](#user-defined-variables-by-environment))
1. In order to run the current test plan, click the green arrow button.

## Running from loadtest1.lib.princeton.edu

* Ensure the User Defined Variables in the Solr test plan are correct and saved
  for the environment (see
  [User Defined Variables by Environment below](#user-defined-variables-by-environment))
* This project is checked out at `/home/deploy/solr_load_testing`
* You can make changes locally, commit and push them to a branch, then check
  that branch out on the server
* SSH onto the box

```bash
ssh deploy@loadtest1.lib.princeton.edu
```

* Run the jmeter test from loadtest1.lib.princeton.edu

```bash
# To test reads:
jmeter -n -t /home/deploy/solr_load_testing/solr_test_plan.jmx -e -l /home/deploy/solr_load_testing/test_report-$(date +"%Y-%m-%d:%H:%M:%S").jtl -o /home/deploy/solr_tests/test_results-$(date +"%Y-%m-%d:%H:%M:%S")/
# To test writes:
JVM_ARGS="-Xms2048m -Xmx2048m" jmeter -n -t /home/deploy/solr_load_testing/solr_write_test_plan.jmx -e -l /home/deploy/solr_load_testing/write_test_report-$(date +"%Y-%m-%d:%H:%M:%S").jtl -o /home/deploy/solr_tests/write_test_results-$(date +"%Y-%m-%d:%H:%M:%S")/
# To test facet.contains queries:
jmeter -n -t /home/deploy/solr_load_testing/solr_facet_contains_test_plan.jmx -e -l /home/deploy/solr_load_testing/facet_contains_test_report-$(date +"%Y-%m-%d:%H:%M:%S").jtl -o /home/deploy/solr_tests/facet_contains_test_results-$(date +"%Y-%m-%d:%H:%M:%S")/
```

* Look at the results on the web at
  [loadtest.lib.princeton.edu/solr_tests/](https://loadtest.lib.princeton.edu/solr_tests/)
  (VPN required)

## Running with k6 (migrating from JMeter)

We are moving these tests from JMeter to
[k6](https://grafana.com/docs/k6/latest/) one test plan at a time.
`devbox shell` installs k6. Until a plan has a k6 port, keep using its JMeter
version.

| JMeter plan | k6 test |
| --- | --- |
| `solr_test_plan.jmx` (reads) | `k6/solr_read_test.js` |
| `solr_write_test_plan.jmx` (writes) | not yet ported |
| `solr_facet_contains_test_plan.jmx` | not yet ported |
| `pulfalight_toc_test_plan.jmx` | not yet ported |

### Read test

`k6/solr_read_test.js` follows `solr_test_plan.jmx`. By default, 200 virtual
users each run 1000 iterations. Each iteration sends the "Single Keyword
Request" for `calculus`, then the "Multiple Keyword Request" with the next
keyword from `keywords.csv`. Every response is checked for a Solr status of `0`.
The disabled "Sitemap Request" was not ported.

Pass settings with `-e NAME=value`:

| Variable | Default |
| --- | --- |
| `HOST` | `lib-solr9-staging.princeton.edu` |
| `PORT` | `8983` |
| `SOLR_CORE` | `catalog-performance` |
| `VUS` | `200` |
| `ITERATIONS` | `1000` (per virtual user) |
| `MAX_DURATION` | `2h` (stops the test if it runs longer) |
| `SINGLE_KEYWORD` | `calculus` |
| `KW_EXPECTED_RESULT_COUNT` | not set; when set, also checks `numFound` for the single keyword request (`12941` on staging) |
| `KEYWORD_FILE` | `../keywords.csv` (relative to the script) |

Use the `k6-read` devbox script to run the test and save its results. Any
arguments are passed to `k6 run`:

```bash
# Run against staging with the defaults
devbox run k6-read
# Small run against local development
devbox run k6-read -e HOST=orangelight.dev.solr.lndo.site -e PORT=80 \
  -e SOLR_CORE=orangelight-core-dev -e VUS=5 -e ITERATIONS=10
```

Each run gives you the equivalent of JMeter's outputs:

| JMeter | k6 |
| --- | --- |
| Summary Report | The summary printed at the end of the run |
| HTML dashboard (`-e -o`) | Live dashboard at <http://localhost:5665> while the test runs, saved to `test_results/k6-read-<timestamp>.html` at the end |
| `.jtl` / Simple Data Writer | `test_results/k6-read-<timestamp>.csv.gz`, one row per measurement |
| View Results Tree | Add `--http-debug=full` (use with `-e VUS=1 -e ITERATIONS=1`) |

Notes:

* Set `K6_WEB_DASHBOARD_OPEN=true` to open the live dashboard in your browser.
* The dashboard updates every second (`K6_WEB_DASHBOARD_PERIOD=1s`). k6 skips
  the HTML report for runs shorter than a few seconds, so give quick runs
  enough iterations to last at least 5 seconds.
* In the CSV, filter on `metric_name` `http_req_duration` for response times.
  The `name` column is the request (`Single Keyword Request` or
  `Multiple Keyword Request`) and `status` is the HTTP status code. Read it
  with `gzip -dc`, or open it in a tool that reads gzipped CSV.

### Trying out a k6 test from your laptop through an SSH tunnel

The staging Solr load balancer only accepts connections from the library
networks. To try out a test from your laptop, forward a local port to it
through one of the dev load balancer hosts:

```bash
# -f backgrounds ssh after login; ExitOnForwardFailure fails if 8983 is taken
ssh -f -N -o ExitOnForwardFailure=yes \
  -L 8983:lib-solr9-staging.princeton.edu:8983 \
  pulsys@adc-dev2.lib.princeton.edu
```

Forward to `lib-solr9-staging.princeton.edu`, not `localhost`. If you forward
to `localhost`, the request reaches nginx from `127.0.0.1`, which is not in its
allow list, and every request gets a `403`. If 8983 is already in use on your
laptop (for example by Lando), use `-L 18983:...` and `-e PORT=18983`.

Check the tunnel, then run a small test against a catalog collection:

```bash
# List the collections
curl -s 'http://localhost:8983/solr/admin/collections?action=LIST&wt=json'
k6 run -e HOST=localhost -e PORT=8983 -e SOLR_CORE=catalog-staging1 \
  -e VUS=2 -e ITERATIONS=30 k6/solr_read_test.js
# Close the tunnel when you are done
pkill -f 'L 8983:lib-solr9-staging'
```

* `connection refused` means the tunnel is not running.
* If every check fails but requests take normal time, Solr is returning errors.
  Make sure the collection matches the test. For example, the read test uses
  catalog fields, so it fails against `pulfalight-staging`. Add
  `--http-debug=full` to see the full requests and responses.
* Use the tunnel only to check that a test works. All traffic goes through one
  SSH connection, so the response times are not meaningful. For real numbers,
  run from loadtest1 with `-e HOST=lib-solr9-staging.princeton.edu`.

## User Defined Variables by Environment

### Development

```text
host orangelight.dev.solr.lndo.site
port 80
solr_core orangelight-core-dev
kw_expected_result_count 1
sitemap_expected_result_count 255
keyword_file_full_path [full path to this repo + /keywords.csv]
```

### From loadtest1.lib.princeton.edu - against Staging

```text
host lib-solr8d-staging.princeton.edu
port 8983
solr_core catalog-performance (for read test) or catalog-write-performance (for write test)
kw_expected_result_count 12941
sitemap_expected_result_count 18170086
keyword_file_full_path /home/deploy/keywords.csv
```

### Generate HTML report

1. Run the test using the CLI mode
1. Once the test has completed, open the JMeter GUI
1. Find where your user.properties file is for your install of JMeter.
   For Homebrew installs, find the actual location with:

   ```bash
   brew --prefix jmeter
   # /opt/homebrew/opt/jmeter
   ls -la /opt/homebrew/opt/jmeter
   # /opt/homebrew/opt/jmeter -> ../Cellar/jmeter/5.6.3
   ```

   The `user.properties` file is in the symlinked directory, under
   `/opt/homebrew/Cellar/jmeter/5.6.3/libexec/bin/user.properties`
1. In JMeter, go to Tools > Generate HTML report
   1. For "Results file" Select the newly created
      `test_results/simple_data_writer.csv` file
   1. For "user.properties file" put in the path you found above
   1. For "Output directory" create an empty directory
   1. Click "Generate report"
1. Open the generated index.html file using your browser

### Record the trial in the spreadsheet

Record what experiment you did, and a link to the report that was generated, in
[this spreadsheet](https://docs.google.com/spreadsheets/d/1zvbCHYgnx0KFNtwVmNV6-yHDJN84kIRKbO5YvywiYFk/edit?usp=sharing).

## Tips on planning a useful test

* When we deploy a new solr configuration with `pul_solr`, it clears the solr
  caches (Filter Cache, Query Cache, etc). If you want to compare two different
  configurations, make sure to deploy them both fresh before running your test
  (unless your test is specifically investigating what happens with a full
  cache).

## Tips on analyzing the data

* If you are comparing between two tests, the dashboard's median response time
  and percentiles can be useful metrics to compare.
* The charts tend not to be very useful unless you are trying to see the impact
  of a particular event that happened _during_ your test (e.g. a cache gradually
  filled, or the solr box hit some resource limit)
