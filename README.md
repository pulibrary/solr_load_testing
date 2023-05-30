## Instructions for local testing
1. Install jmeter
```bash
brew install jmeter 
```
1. Start jmeter - this will open the GUI, which should only be used when building tests, not when actually load testing.
```bash
jmeter
```

## Notes for future testing against staging
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
* This makes solr available locally at localhost:9379

* Would it be better to go from a server on Princeton's network (e.g., the bibdata-staging worker machine), so that Developer's internet connection doesn't affect benchmarking

