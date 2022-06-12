const aws = require("aws-sdk");
const sharp = require("sharp");
const s3 = new aws.S3({ apiVersion: "2006-03-01" });

exports.handler = async (event) => {
    // get key file
    const Key = event.Records[0].s3.object.key;

    // read file from S3
    const file = await readFileFromS3(Key);

    // inizializza sharp
    const image = await sharp(file);

    // leggi dimensioni
    const { width, height } = await image.metadata();

    const widthToHeightRatio = width / height;

    // se una dimensione è > 1150 ridimensiona prendendo la dimensione maggiore settandola a 1150
    if (width > 1150 || height > 1150) {
        const options = width >= height ? { width: 1150 } : { height: 1150 };
        options.withoutEnlargement = true;
        await image.resize(options);
    }

    // all'opposto se una dimensione è < 600 ridimensiona prendendo la dimensione minore settandola a 600
    if (width < 600 || height < 600) {
        const options = width <= height ? { width: 600 } : { height: 600 };
        await image.resize(options);
    }

    // get logo filename
    /* const keyLogo =
        widthToHeightRatio >= 0.6
            ? process.env.PATH_LOGO
            : process.env.PATH_THUMBNAIL_LOGO;

    // read logo from S3
    const logo = await readFileFromS3(keyLogo);

    // compositing
    const configuration = Key.includes("done")
        ? { input: logo }
        : { input: logo, gravity: "southeast" };

    image.composite([configuration]); */

    const fileElaborato = await image.toBuffer();

    // write new file on signed photos S3 bucket
    params = {
        Bucket: process.env.WRITE_BUCKET_NAME,
        Key,
        Body: fileElaborato,
        ContentType: process.env.CONTENT_TYPE,
    };

    await s3.upload(params).promise();

    const response = {
        statusCode: 200,
        body: JSON.stringify("Hello from Lambda!"),
    };
    return response;
};

const readFileFromS3 = async (Key) => {
    console.log(Key);
    const params = {
        Bucket: process.env.READ_BUCKET_NAME,
        Key,
    };
    const { Body } = await s3.getObject(params).promise();
    return Body;
};
