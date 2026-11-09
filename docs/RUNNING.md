# Running and importing the project

## Daily development start

```bash
docker start comp7503-mongo comp7503-nodered
open http://localhost:1880
```

Confirm the containers are on the same network:

```bash
docker inspect comp7503-mongo --format '{{json .NetworkSettings.Networks}}'
docker inspect comp7503-nodered --format '{{json .NetworkSettings.Networks}}'
```

## Clean setup

Use the commands in the main README to create the network and containers. Install the Dashboard and MongoDB palettes from Node-RED's Manage palette screen, then import `flows/PriceWatch_latest.json` once.

## Static assets

The flow's HTTP routes expect the following container paths:

```text
/data/pricewatch-groceries.jpg
/data/pricewatch-merchant-logos/<MERCHANT_CODE>.png
```

Copy the tracked files from `assets/` as described in the main README. Do not create another HTTP route for the same assets.

## Importing data safely

The repository does not include the large history export. If a local snapshot is supplied separately, inspect whether it is newline-delimited MongoDB export or a JSON array before importing. Never run `mongoimport --drop` unless the database is a disposable test database.

After import, check the shape with:

```bash
docker exec comp7503-mongo mongosh comp7503 --quiet --eval '
printjson({
  history: db.pricewatch_history.countDocuments(),
  batches: db.pricewatch_batches.countDocuments(),
  success: db.pricewatch_batches.countDocuments({status:"success"})
})'
```

## Updating the flow

Before replacing a deployed flow:

```bash
curl -fsS http://localhost:1880/flows > flows/PriceWatch_live_backup.json
```

Import the new complete JSON, deploy once, and verify all three routes. Keep backups outside the public repository if they contain local experiments or private data.

## Troubleshooting

- **MongoDB connection error:** confirm the Node-RED MongoDB host is `comp7503-mongo` and both containers share `comp7503-net`.
- **Empty pages:** check that at least one successful batch exists and that the selected batch has matching history records.
- **Missing logos:** recopy `assets/merchant-logos` into `/data/pricewatch-merchant-logos` and check filename case.
- **Favorites missing after switching browsers:** this is expected; Favorites are browser-local by design.
- **Duplicate pages after import:** restore the previous flow and replace it with the complete JSON instead of appending a second copy.
