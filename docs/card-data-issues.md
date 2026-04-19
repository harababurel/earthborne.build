# Card Data Issues

Known discrepancies between the rangers-card-data source and physical card printings.

## Printing differences

### Quiet (Reward)

The rangers-card-data text includes `Unique.` in the keyword line (`Friendly. Persistent. Unique.`), but the first-printing card image only shows `Friendly. Persistent.`. This is likely a change introduced in the second printing. The `Unique` keyword currently comes from the text data, not the image.

To address: confirm which printing is canonical and decide whether to follow the data or the image.

## Metadata discrepancies

### Superior Trail

The metadata for "Superior Trail" lists its progress threshold as a static `2`. However, it should be a per-ranger value ("2R" or 2 per ranger). This will need to be addressed in the `rangers-card-data` repo once forked.
