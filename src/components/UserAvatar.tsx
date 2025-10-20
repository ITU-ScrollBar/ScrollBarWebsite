import { Avatar, notification, Upload } from "antd";
import { Tender, UserProfile } from "../types/types-file";
import avatar from '../assets/images/avatar.png';
import newbiehat from '../assets/images/newbiehat.svg';
import { deleteFileFromStorage, uploadProfilePicture } from "../firebase/api/authentication";
import useTenders from "../hooks/useTenders";
import { useEffect, useState } from "react";

type UserAvatarProps = {
    user: UserProfile | Tender;
    size?: number;
    showHats?: boolean;
    backgroundColor?: string;
}

type UserAvatarWithUploadProps = UserAvatarProps & {
    onChange: (url: string) => void;
}

export const UserAvatar = ({ user, size = 128, showHats = true, backgroundColor, ...divProps }: UserAvatarProps & Record<string, any>) => {
    const [ photoUrl, setPhotoUrl ] = useState(user.photoUrl);
    const [ showNewbieHat, setShowNewbieHat ] = useState(showHats);

    useEffect(() => {
        setPhotoUrl(user.photoUrl);
    }, [user.photoUrl]);

    useEffect(() => {
        setShowNewbieHat(showHats && (user.roles?.includes('newbie') ?? false));
    }, [showHats, user.roles]);

    const passedStyle = divProps.style || {};
    const combinedStyle = {
        position: "relative",
        display: "inline-block",
        width: size + 3,
        height: size + 3,
        backgroundColor: backgroundColor || "transparent",
        borderRadius: "50%",
        ...passedStyle,
    };

    const restProps = { ...divProps };
    delete restProps.style;

    return (
        <div {...restProps} style={combinedStyle}>
            <Avatar src={photoUrl || avatar} size={size} style={{ display: "block", left: 1.5, top: 1.5 }} />
            {showNewbieHat && (
                <img
                    src={newbiehat}
                    alt="Newbie Hat"
                    style={{
                        position: "absolute",
                        left: "50%",
                        top: -size * 0.55,
                        transform: "translateX(-50%)",
                        width: size * 0.85,
                        height: "auto",
                        pointerEvents: "none",
                        zIndex: 10,
                    }}
                />
            )}
        </div>
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
