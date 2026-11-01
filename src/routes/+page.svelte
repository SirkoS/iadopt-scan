<script lang="ts">
  import {buildQuery, getCombinations, getNamedGraphs as getNamedGraphs, runCountQuery } from '#lib/util.ts';
  import { Input, Label, Button, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell, Radio, Heading, List, Li, Progressbar } from 'flowbite-svelte';

  type EntryType = {
    comb: string[],
    query: string,
    count: Promise<number>,
  }

  // state
  let endpoint = $state('https://vocab.nerc.ac.uk/sparql');
  let namespace = $state('https://w3id.org/iadopt/ont/');
  let namedGraphs : string[] = $state([]);
  let scanEnabled = $state(true);
  let results : EntryType[] = $state([]);
  let finishedQueries = $state(0);
  let emptyResults = $state(0);



  // start scan
  const runScan = async () => {

    // disable button
    scanEnabled = false;

    // fetch Named Graphs
    namedGraphs = await getNamedGraphs( endpoint );

    // track finished queries
    finishedQueries = 0;

    // create new query list
    results = [ ... getCombinations() ]
      .sort( (a,b) => a.length - b.length || a.toString().localeCompare( b.toString() ))
      .map( (comb) => {

        // get queries
        const query = buildQuery( endpoint, namespace, comb );

        // start queries and pass on results
        const entry = {
          comb: comb,
          query: query.list,
          count: runCountQuery( endpoint, query.count ),
        };

        // count finished queries
        entry.count.then( (c) => {
          finishedQueries += 1;
          if(!c) {
            emptyResults += 1;
          }
        });

        return entry;

      });


  };
</script>

<div class="mb-10  flex flex-col max-w-200 m-auto my-10">

  <div>
    <div class="mb-6">
      <Label for="endpoint" class="mb-2">SPARQL endpoint</Label>
      <Input id="endpoint" bind:value={endpoint} disabled={!scanEnabled} />
    </div>


    <div class="mb-6">
      <Label class="mb-2">Namespace</Label>

      <Radio value="https://w3id.org/iadopt/ont/" bind:group={namespace} disabled={!scanEnabled}>https://w3id.org/iadopt/ont/</Radio>
      <Radio value="https://w3id.org/iadopt/ont#" bind:group={namespace} disabled={!scanEnabled}>https://w3id.org/iadopt/ont#</Radio>
    </div>

    {#if scanEnabled}
      <Button class="w-full" type="submit" onclick={runScan} disabled={!scanEnabled}>
        Start Scan
      </Button>
    {:else}
      <Progressbar class="w-full font-medium text-sm rounded-lg"
                    classes={{
                      label: 'text-base font-medium text-center px-5 py-2.5 leading-none rounded-lg',
                    }}
                  animate size="h-10" labelInside
                  progress={(100 * finishedQueries / results.length) || 0} />
    {/if}
  </div>

  {#if results.length }

    <Heading tag="h1" class="m-4 text-xl font-bold text-center md:text-xl lg:text-xl">
      Scan Results for
      <br>
      <a class="font-mono" href={endpoint} rel="external" target="_blank">{endpoint}</a>
    </Heading>

    <Heading tag="h2" class="m-4 text-base font-bold text-center md:text-xl lg:text-xl">
      Named Graphs
    </Heading>
    <List tag="ul" class="mb-5">
      {#if namedGraphs.length}
        {#each namedGraphs as graph (graph)}
          <Li>{graph}</Li>
        {/each}
      {:else}
        <Li class="italic">None found - using default graph.</Li>
      {/if}
    </List>

    <Table class="mt-5">
      <TableHead>
        <TableHeadCell>Combination</TableHeadCell>
        <TableHeadCell>Number of Entities</TableHeadCell>
        <TableHeadCell>Link to results</TableHeadCell>
      </TableHead>
      <TableBody>
        <TableBodyRow>
          <TableBodyCell colspan={3} class="text-sm italic text-center">{emptyResults} of {results.length} combinations without entities</TableBodyCell>
        </TableBodyRow>
        {#each results as row (row) }
          {#await row.count then count}
            {#if count}
              <TableBodyRow>
                <TableBodyCell>{row.comb.join( ', ')}</TableBodyCell>
                <TableBodyCell>
                    {count}
                </TableBodyCell>
                <TableBodyCell><a
                  class="underline"
                  href="http://vocab.nerc.ac.uk/sparql/sparql?query={encodeURIComponent( row.query )}&format=text/csv" target="_blank">
                  Download List of Entities
                </a></TableBodyCell>
              </TableBodyRow>
            {/if}
          {/await}
        {/each}
      </TableBody>
    </Table>
  {/if}
</div>
