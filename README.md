## Instructions for developing tests
1. Install jmeter
```bash
brew install jmeter 
```
1. Start jmeter - this will open the GUI, which should only be used when building or editing tests, not when actually load testing.
```bash
jmeter
```
1. From the GUI, select File > Open then browse to the test plan you want to work on (.e.g. `test_dev.jmx`)
1. You may need to press the "plus" buttons to the left of the headers to see the full plan.
1. If you are running against staging, first tunnel in using the instructions for pul_solr, below.
1. In order to run the current test plan, click the green arrow button.

## Notes for testing against staging
Orangelight staging is configured to look at
```yaml
ol_solr_url: http://lib-solr8-staging.princeton.edu:8983/solr/catalog-staging
```
* I believe to connect to this instance you need to tunnel in
* Notes from https://github.com/pulibrary/pul_solr#connecting-to-solr-ui:

There are capistrano tasks to connect to the Solr UI for managing solr that can be run from the project directory on your machine.  You will need to be connected to VPN for the tasks to run.

 * Staging Solr 8
   ```
   # from the pul_solr repository
   bundle exec cap staging solr:console
   ```
* This makes solr available locally at localhost:9307

* Would it be better to go from a server on Princeton's network (e.g., the bibdata-staging worker machine), so that Developer's internet connection doesn't affect benchmarking

