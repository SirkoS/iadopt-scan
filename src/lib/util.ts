import Bottleneck from 'bottleneck';

// properties to be scanned
const PROPS : Record<string, string> = {
  'Property': 'hasProperty',
  'OoI':      'hasObjectOfInterest',
  'Matrix':   'hasMatrix',
  'Context':  'hasContextObject',
  'StatMod':  'hasStatisticalModifier',
};
const CLASSES = [ 'Variable' ];

// memorize named graphs
const NAMED_GRAPHS : Record<string, string[]> = {};



/**
 * build the query for the given properties
 */
export function buildQuery( endpoint: string, namespace: string, props: string[] ) : Record< 'list' | 'count', string> {

  return {
    count: `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX iop: <${namespace}>

SELECT (COUNT( DISTINCT ?sub ) AS ?count)
${NAMED_GRAPHS[endpoint].map( (e) => `FROM <${e}>` ).join( '\n' )}
WHERE {
  ?sub
${
  props
    .map( (p) => `iop:${PROPS[p]} []` )
    .join( '; ')
}
   .

${
  Object.keys( PROPS )
    .filter( (p) => !props.includes( p ))
    .map( (p) => `FILTER NOT EXISTS { ?sub iop:${PROPS[p]} [] }` )
    .join( '\n' )
}
}
  `,
    list: `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX iop: <${namespace}>

SELECT *
WHERE {
  ?sub
${
  props
    .map( (p) => `iop:${PROPS[p]} []` )
    .join( '; ')
}
   .

${
  Object.keys( PROPS )
    .filter( (p) => !props.includes( p ))
    .map( (p) => `FILTER NOT EXISTS { ?sub iop:${PROPS[p]} [] }` )
    .join( '\n' )
}
  }
  `
  } ;
}


/**
 * generate all combinations of properties
 */
export function* getCombinations() : Generator<string[]> {

  // list of keys
  const keys = Object.keys( PROPS );

  // we enumerate all combinations in binary:
  //   1 -> element included
  //   0 -> element not included
  // this is the maximum number we get by such an iteration
  const maxIndex = Math.pow( 2, keys.length ) - 1;

  // list all permutations
  for( let comb=1; comb<maxIndex; comb++ ) {
    yield keys.filter( (_, i) => comb & Math.pow( 2, i ) );
  }

}


// we need a rate limiter to not overwhelm the endpoint
const limiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: 1000,
});


/**
 * run a single query against the endpoint
 */
export const runQuery = limiter.wrap( async function runQuery( endpoint: string, query: string ) : Promise<string> {

  // build parameters
  const formData = new URLSearchParams();
  formData.set( 'query', query );

  // run query
  const res = await fetch( endpoint, {
    method: 'POST',
    body: formData.toString(),
    headers: {
      'Accept': 'text/csv',
      'Content-Type': 'application/x-www-form-urlencoded',
    }
  });

  // parse result
  return res.text();

} );


/**
 * run a query supposed to result in a single count
 */
export async function runCountQuery( endpoint: string, query: string ) {

  let raw = await runQuery( endpoint, query );

  if( !raw.includes( 'count' ) ) {
    raw = atob( raw );
  }
  return +(raw.trim().split('\n').pop() ?? -1);

}




/**
 * determine the list of subgraphs within this graph if any
 */
export async function getNamedgraphs( endpoint: string ) {

  // short circuit if we already fetched them
  if( endpoint in NAMED_GRAPHS ) {
    return NAMED_GRAPHS[ endpoint ];
  }

  // run query
  const query = `
SELECT DISTINCT ?g
WHERE {
  GRAPH ?g { ?s ?p ?o }
}
  `;
  const raw = await runQuery( endpoint, query );

  // skip header row but keep remainder
  NAMED_GRAPHS[ endpoint ] = raw
    .trim()
    .split( '\n' )
    .slice( 1 )
    .map( (g) => g.trim() );

  return NAMED_GRAPHS[ endpoint ];

}
