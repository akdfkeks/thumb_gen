import { S3Client, GetObjectCommand, PutObjectCommand, CopyObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import sharp from "sharp";
import util from "util";

const s3 = new S3Client({ region: "ap-northeast-2" });

const isResizable = (ext) => ["jpg", "jpeg", "png", "webp"].includes(ext);

export const handler = async (event, context) => {
	console.log("Reading options from event:\n", util.inspect(event, { depth: 5 }));
	const srcBucket = event.Records[0].s3.bucket.name;

	const srcKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
	const dstBucket = `${srcBucket}-resized`;
	const dstKey = srcKey;

	const typeMatch = srcKey.match(/\.([^.]*)$/);
	if (!typeMatch) {
		console.log("Could not determine the image type.");
		return;
	}

	if (!isResizable(typeMatch[1].toLowerCase())) {
		await s3.send(
			new CopyObjectCommand({
				Bucket: dstBucket,
				Key: dstKey,
				CopySource: `${srcBucket}/${srcKey}`,
			})
		);
		return;
	}

	try {
		var response = await s3.send(
			new GetObjectCommand({
				Bucket: srcBucket,
				Key: srcKey,
			})
		);
		var stream = response.Body;

		if (stream instanceof Readable) {
			var content_buffer = Buffer.concat(await stream.toArray());
		} else {
			throw new Error("Unknown object stream type");
		}
	} catch (error) {
		console.log(error);
		return;
	}

	const width = 200;

	try {
		const image = sharp(content_buffer);
		var output_buffer;
		if ((await image.metadata()).width <= width) {
			output_buffer = await image.toBuffer();
		} else {
			output_buffer = await image.resize(width).toBuffer();
		}
	} catch (error) {
		console.log(error);
		return;
	}

	try {
		await s3.send(
			new PutObjectCommand({
				Bucket: dstBucket,
				Key: dstKey,
				Body: output_buffer,
				ContentType: response.ContentType,
			})
		);
	} catch (error) {
		console.log(error);
		return;
	}

	console.log("Successfully resized " + srcBucket + "/" + srcKey + " and uploaded to " + dstBucket + "/" + dstKey);
};
