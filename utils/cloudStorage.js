const imagekit = require('../libs/imagekit');

module.exports = {
  upload: async (buffer, originalname, folder) => {
    const { url, fileId } = await imagekit.upload({
      file: buffer.toString('base64'),
      fileName: Date.now() + '-' + originalname.replace(/ /g, '-'),
      folder
    });

    return { url, fileId };
  },
  delete: async (fileId) => {
    await imagekit.deleteFile(fileId);
  }
};