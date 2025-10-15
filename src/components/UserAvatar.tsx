import { Avatar, notification, Upload } from "antd";
import { Tender, UserProfile } from "../types/types-file";
import avatar from '../assets/images/avatar.png';
import { deleteFileFromStorage, uploadProfilePicture } from "../firebase/api/authentication";
import useTenders from "../hooks/useTenders";
import { useEffect, useState } from "react";

type UserAvatarProps = {
    user: UserProfile | Tender;
}

type UserAvatarWithUploadProps = {
    user: Tender;
    onChange: (url: string) => void;
}

export const UserAvatar = ({ user }: UserAvatarProps) => {
    const [ photoUrl, setPhotoUrl ] = useState(user.photoUrl ?? avatar);
    
    useEffect(() => {
        setPhotoUrl(user.photoUrl ?? avatar);
    }, [user.photoUrl]);

    return (
        <Avatar src={photoUrl} size={128} style={{ marginBottom: 16 }} />
    );
};

export const UserAvatarWithUpload = ({ user, onChange }: UserAvatarWithUploadProps) => {
    const { updateTender } = useTenders();
    const [api] = notification.useNotification();
    const tokenRegex = /(\?alt=media&token=[\w-]+)$/;

    return <Upload
        customRequest={({ file }: any) => {
            uploadProfilePicture(file, user.email).then((url) => {
                onChange(url);
                const previousUrl = user.photoUrl;
                updateTender(user.uid, 'photoUrl', url);

            // Remove the previous file to avoid old pictures laying around forever
            if (previousUrl && previousUrl.replace(tokenRegex, '') !== url.replace(tokenRegex, '')) {
                deleteFileFromStorage(previousUrl);
            }
        }).catch((error) => {
            api.error({
                message: "Error",
                description: "Failed to upload profile picture: " + error.message,
                placement: "top",
            });
        });
    }}
    showUploadList={false}
    accept="image/*"
    >
        <UserAvatar user={user} />
    </Upload>
};