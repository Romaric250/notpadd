import { getSingleSpace } from "@/actions/note";
import CodeBlock from "@/components/code-block";
import UserNotFound from "@/components/not-found/user";
import { getCurrentUser } from "@/lib/current-user";
import { Metadata } from "next";
import Blogs from "./_components/blogs";
import { encryptBase64 } from "@/actions/en-de";

type Props = {
  params: { spaceKey: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const user = await getCurrentUser();

  if (!user)
    return {
      title: "User not found",
    };

  const space = await getSingleSpace(user?.id, params.spaceKey);

  if (!space)
    return {
      title: "Not found",
    };

  const title = space.title.charAt(0).toUpperCase() + space.title.slice(1);

  return {
    title: title,
  };
}

const SingleSpace = async ({ params }: { params: { spaceKey: string } }) => {
  const user = await getCurrentUser();

  if (!user) return <UserNotFound />;

  const singleSpace = await getSingleSpace(user.id, params.spaceKey);

  if (!singleSpace) return <div>NO space was found with that key</div>;

  const encryptedUserId = encryptBase64(user.userId);
  const encryptedSpaceId = encryptBase64(singleSpace.id);

  const code = `
  // this values should be used wisely
  next_notpadd_userId=${encryptedUserId}
  next_notpadd_spaceKey=${encryptedSpaceId}
  // Uncomment these lines if you need to send these headers
  // get_all_articles: "True",
  // get_only_private_articles: "",
  get_only_public_articles: "True",`;

  return (
    <div className="flex flex-col gap-3">
      <CodeBlock code={code} language="bash" />
      <Blogs userId={user.id} space={singleSpace} />
    </div>
  );
};

export default SingleSpace;
