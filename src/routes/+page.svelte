<script lang="ts">
  import {buildQuery, getCombinations, getNamedgraphs, runCountQuery, runQuery} from '#lib/util.ts';
  import { Input, Label, Button, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell, Radio, Heading, List, Li } from 'flowbite-svelte';

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



  // start scan
  const runScan = async () => {

    // disable button
    scanEnabled = false;

    // fetch Named Graphs
    namedGraphs = await getNamedgraphs( endpoint );

    // create new query list
    results = [ ... getCombinations() ]
      .sort( (a,b) => a.length - b.length || a.toString().localeCompare( b.toString() ))
      .map( (comb) => {

        // get queries
        const query = buildQuery( endpoint, namespace, comb );

        // start queries and pass on results
        return {
          comb: comb,
          query: query.list,
          count: runCountQuery( endpoint, query.count ),
        };

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


    <Button class="w-full" type="submit" onclick={runScan} disabled={!scanEnabled}>Start Scan</Button>
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
    <List tag="ul">
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
        {#each results as row (row) }
          <TableBodyRow>
            <TableBodyCell>{row.comb.join( ', ')}</TableBodyCell>
            <TableBodyCell>
              {#await row.count}
                --waiting--
              {:then count}
                {count}
              {/await}
            </TableBodyCell>
            <TableBodyCell><a
              class="underline"
              href="http://vocab.nerc.ac.uk/sparql/sparql?query={encodeURIComponent( row.query )}&format=text/csv" target="_blank">
              Download List of Entities
            </a></TableBodyCell>
          </TableBodyRow>
        {/each}
      </TableBody>
    </Table>
  {/if}
</div>
