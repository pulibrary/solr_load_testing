## Instructions for developing tests
1. Install jmeter
```bash
brew install jmeter 
```
1. Start jmeter - this will open the GUI, which should only be used when building or editing tests, not when actually load testing.
```bash
jmeter
```
1. From the GUI, select File > Open then browse to the test plan you want to work on (.e.g. `solr_test_plan.jmx`)
1. You may need to press the "plus" buttons to the left of the headers to see the full plan.
1. Go to the User Defined Variables under the top-level "Solr test plan" and make sure the variables match the environment you want to work against (see [User Defined Variables by Environment below](#user-defined-variables-by-environment))
1. In order to run the current test plan, click the green arrow button.

## Running from loadtest.lib.princeton.edu
* Ensure the User Defined Variables in the Solr test plan are correct and saved for the environment (see [User Defined Variables by Environment below](#user-defined-variables-by-environment))
* Copy the test file onto the remote host
```bash
scp solr_test_plan.jmx deploy@loadtest.lib.princeton.edu:~/
```
* Copy the keywords file onto the remote host
```bash
scp keywords.csv deploy@loadtest.lib.princeton.edu:~/
```
* SSH onto the box
```bash
ssh deploy@loadtest.lib.princeton.edu
```
* Run the jmeter test from loadtest.lib.princeton.edu
```bash
jmeter -n -t solr_test_plan.jmx
```
* If you want to keep the results on the server, copy the results to a dated folder, e.g.
```bash
mv test_results/ test_results-2023-06-07/
```
* Copy the results to your local machine (from the remote), e.g.
```bash
scp deploy@loadtest.lib.princeton.edu:~/test_results-2023-06-07/simple_data_writer.csv ./test_results
```
## User Defined Variables by Environment
### Development
```
host orangelight.dev.solr.lndo.site
port 80
solr_core orangelight-core-dev
kw_expected_result_count 1
sitemap_expected_result_count 255
keyword_file_full_path [full path to this repo + /keywords.csv]
```
### From loadtest.princeton.edu - against Staging
```
host lib-solr8-staging.princeton.edu
port 8983
solr_core catalog-staging
kw_expected_result_count 12941
sitemap_expected_result_count 18170086
keyword_file_full_path /home/deploy/keywords.csv
```

### Generate HTML report
1. Run the test using the CLI mode
1. Once the test has completed, open the JMeter GUI
1. Find where your user.properties file is for your install of JMeter
  * I used Homebrew to install locally, so to find the actual location, I did:
  ```bash
  ➜  ~ brew --prefix jmeter
/opt/homebrew/opt/jmeter
➜  ~ ls -la /opt/homebrew/opt/jmeter
lrwxr-xr-x  1 kadelm  admin  20 May 30 09:28 /opt/homebrew/opt/jmeter -> ../Cellar/jmeter/5.5
  ```
  * For homebrew installs, the `user.properties` file is in the symlinked directory, under `/opt/homebrew/Cellar/jmeter/5.5/libexec/bin/user.properties`
1. In JMeter, go to Tools > Generate HTML report
  1. For "Results file" Select the newly created `test_results/simple_data_writer.csv` file
  1. For "user.properties file" put in the path you found above
  1. For "Output directory" create an empty directory
  1. Click "Generate report"
1. Open the generated index.html file using your browser
