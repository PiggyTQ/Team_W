export const avatarChoices=['/mascot/q-avatar.png','/mascot/q-read.png','/mascot/q-note.png','/illustrations/yellow-blue/compass.png','/illustrations/yellow-blue/portfolio.png'];
export const accountAvatar=value=>avatarChoices.includes(value)||typeof value==='string'&&value.length<120000&&/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(value)?value:avatarChoices[0];
