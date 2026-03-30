import { DeleteOutlined } from "@ant-design/icons";
import { Button, Card, Col, List, Popconfirm, Row, Typography } from "antd";
import { useState } from "react";
import { UserAvatar } from "../../../components/UserAvatar";
import { Engagement, Tender, engagementType } from "../../../types/types-file";

const { Text } = Typography;

type EngagementListProps = {
	engagements: Engagement[];
	title: string;
	tenders: Tender[];
	onRemove: (engagement: Engagement) => void;
};

export default function EngagementList({
	engagements,
	title,
	tenders,
	onRemove,
}: EngagementListProps) {
	const [hovered, setHovered] = useState<string | null>(null);

	const getTenderById = (userId: string | undefined): Tender | undefined => {
		if (!userId) return undefined;
		return tenders.find((t) => t.uid === userId);
	};

	return (
		<Card
			title={<Text strong>{title}</Text>}
			style={{ marginBottom: "16px" }}
			bodyStyle={{ padding: "12px" }}
		>
			{engagements.length > 0 ? (
				<List
					itemLayout="horizontal"
					grid={{ column: 5, xl: 4, lg: 3, md: 2, sm: 2, xs: 1 }}
					dataSource={engagements}
					renderItem={(engagement) => {
						const tender = getTenderById(engagement.userId);
						if (!tender) return null;
						return (
							<List.Item
								onMouseEnter={() => setHovered(engagement.id)}
								onMouseLeave={() => setHovered(null)}
							>
								<Popconfirm
									title="Remove this person?"
									onConfirm={() => onRemove(engagement)}
									okText="Yes"
									cancelText="No"
								>
									<Button
										style={{
											position: "absolute",
											top: 0,
											left: 0,
											width: "100%",
											height: "100%",
											opacity: hovered === engagement.id ? 0.8 : 0,
											transition: "opacity 0.2s ease-in-out",
											zIndex: 2,
											cursor: "pointer",
										}}
										type="text"
										danger
										icon={<DeleteOutlined style={{ opacity: 1 }} />}
									/>
								</Popconfirm>
								<Row
									style={{
										opacity: 1,
										transition: "opacity 0.2s ease-in-out",
									}}
									align="middle"
									gutter={8}
								>
									<Col span={4}>
										<UserAvatar
											user={tender}
											size={40}
											style={{
												backgroundColor:
													engagement.type === engagementType.ANCHOR
														? "#FFD600"
														: "#1890ff",
											}}
										/>
									</Col>
									<Col span={18}>
										<Text>{tender.displayName || "Unknown"}</Text>
										<br />
										<Text type="secondary">{tender.email}</Text>
									</Col>
								</Row>
							</List.Item>
						);
					}}
				/>
			) : (
				<Text
					type="secondary"
					style={{ display: "block", padding: "12px", textAlign: "center" }}
				>
					No {title.toLowerCase()} assigned
				</Text>
			)}
		</Card>
	);
}
