<script lang="ts">
  import {buildQuery, getCombinations, runQuery} from '#lib/util.ts';
  import { Input, Label, Button, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell, Radio } from 'flowbite-svelte';

  type EntryType = {
    comb: string[],
    query: string,
    count: Promise<number>,
  }

  // state
  let endpoint = $state('https://vocab.nerc.ac.uk/sparql');
  let namespace = $state('https://w3id.org/iadopt/ont/');
  let scanEnabled = $state(true);
  let results : EntryType[] = $state([]);



  // start scan
  const runScan = () => {

    // disable button
    scanEnabled = false;

    // create new query list
    results = [ ... getCombinations() ]
      .sort( (a,b) => a.length - b.length || a.toString().localeCompare( b.toString() ))
      .map( (comb) => {

        // get queries
        const query = buildQuery( namespace, comb );

        // start queries and pass on results
        return {
          comb: comb,
          query: query.list,
          count: runQuery( endpoint, query.count ),
        };

      });


  };
</script>

<div class="mb-10  flex flex-col max-w-200 m-auto my-10">

  <div>
    <div class="mb-6">
      <Label for="endpoint" class="mb-2">SPARQL endpoint</Label>
      <Input id="endpoint" value={endpoint} />
    </div>


    <div class="mb-6">
      <Label class="mb-2">Namespace</Label>

      <Radio value="https://w3id.org/iadopt/ont/" bind:group={namespace}>https://w3id.org/iadopt/ont/</Radio>
      <Radio value="https://w3id.org/iadopt/ont#" bind:group={namespace}>https://w3id.org/iadopt/ont#</Radio>
    </div>


    <Button class="w-full" type="submit" onclick={runScan} disabled={!scanEnabled}>Start Scan</Button>
  </div>

  <Table>
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

</div>
