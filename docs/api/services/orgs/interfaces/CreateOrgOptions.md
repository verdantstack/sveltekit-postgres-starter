[**sveltekit-postgres-starter**](../../../README.md)

***

# Interface: CreateOrgOptions

What a caller may choose about a new tenant's placement.

## Remarks

Both fields are optional, and omitting them is the sane default:
`regionCode` falls back to the deployment's `REGION_DEFAULT` (validated, never
trusted) and `dpaAccepted` is only consulted by a region whose policy requires
an agreement. `createOrg()` still does the deciding — this is a request, not a
decision — which is why the shape carries no resolved region.

## Properties

### dpaAccepted?

> `optional` **dpaAccepted**: `boolean`

Whether the creator accepted that region's DPA in this request.

***

### regionCode?

> `optional` **regionCode**: `string` \| `null`

The region to home the tenant in; omitted means `REGION_DEFAULT`.
