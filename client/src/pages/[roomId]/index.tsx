import ChatBox from "@/component/ChatBox/ChatBox";
import RemotePeer from "@/component/RemotePeer/RemotePeer";
import { TPeerMetadata } from "@/utils/types";
import {
  useLocalAudio,
  useLocalPeer,
  useLocalScreenShare,
  useLocalVideo,
  usePeerIds,
  useRoom,
} from "@huddle01/react/hooks";
import { AccessToken, Role } from "@huddle01/server-sdk/auth";
import { Inter } from "next/font/google";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";

const inter = Inter({ subsets: ["latin"] });

type Props = {
  token: string;
};

export default function Home({ token }: Props) {
  const [displayName, setDisplayName] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenRef = useRef<HTMLVideoElement>(null);
  const [remotePeers, setRemotePeers] = useState([]);
  const router = useRouter();

  const { joinRoom, state, closeRoom } = useRoom({
    onJoin: (room) => {
      console.log("onJoin", room);
      updateMetadata({ displayName });
      const recordMeet = async () => {
        const status = await fetch(`/api/startRecording?roomId=${router.query.roomId}`);
        const data = await status.json();
      }
      recordMeet();
    },
    onPeerJoin: (peer) => {
      console.log(peer);
    },
  });
  const { enableVideo, isVideoOn, stream, disableVideo } = useLocalVideo();
  const { enableAudio, disableAudio, isAudioOn } = useLocalAudio();

  const { startScreenShare, stopScreenShare, shareStream } =
    useLocalScreenShare();
  const { updateMetadata } = useLocalPeer<TPeerMetadata>();

  const { peerIds } = usePeerIds();


  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (shareStream && screenRef.current) {
      screenRef.current.srcObject = shareStream;
    }
  }, [shareStream]);

  const closeRoomAndStopMeeting = async () => {
    const response = await fetch(`/api/stopRecording?roomId=${router.query.roomId}`);
    const data = await response.json();
    closeRoom();
    router.push("/summary");
  }

  return (
    <main
      className={`flex min-h-screen flex-col items-center p-4 ${inter.className}`}
    >
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
          <code className="font-mono font-bold">{state}</code>
        </p>
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:h-auto lg:w-auto lg:bg-none">
          {state === "idle" && (
            <>
              <input
                disabled={state !== "idle"}
                placeholder="Display Name"
                type="text"
                className="border-2 border-blue-400 rounded-lg p-2 mx-2 bg-black text-white"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />

              <button
                disabled={!displayName}
                type="button"
                className="bg-blue-500 p-2 mx-2 rounded-lg"
                onClick={async () => {
                  await joinRoom({
                    roomId: router.query.roomId as string,
                    token,
                  });
                }}
              >
                Join Room
              </button>
            </>
          )}

          {state === "connected" && (
            <>
              <button
                type="button"
                className="bg-blue-500 p-2 mx-2 rounded-lg"
                onClick={async () => {
                  isVideoOn ? await disableVideo() : await enableVideo();
                }}
              >
                {isVideoOn ? "Disable Video" : "Enable Video"}
              </button>
              <button
                type="button"
                className="bg-blue-500 p-2 mx-2 rounded-lg"
                onClick={async () => {
                  isAudioOn ? await disableAudio() : await enableAudio();
                }}
              >
                {isAudioOn ? "Disable Audio" : "Enable Audio"}
              </button>
              <button
                type="button"
                className="bg-blue-500 p-2 mx-2 rounded-lg"
                onClick={async () => {
                  shareStream
                    ? await stopScreenShare()
                    : await startScreenShare();
                }}
              >
                {shareStream ? "Disable Screen" : "Enable Screen"}
              </button>
              <button
                type="button"
                className="bg-blue-500 p-2 mx-2 rounded-lg"
                onClick={closeRoomAndStopMeeting}
              >
                Close Meeting
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ height: '100vh' }} className="w-full mt-8 flex gap-4 justify-between">
        <div className="">
          <div className="">
            <div className="flex flex-row justify-center items-center">
              {isVideoOn && (
                <div className="w-1/2 mx-auto border-2 rounded-xl border-blue-400">
                  <video
                    ref={videoRef}
                    className="aspect-video rounded-xl"
                    autoPlay
                    muted
                  />
                </div>
              )}
              {shareStream && (
                <div className="w-1/2 mx-auto border-2 rounded-xl border-blue-400">
                  <video
                    ref={screenRef}
                    className="aspect-video rounded-xl"
                    autoPlay
                    muted
                  />
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 mb-32 grid gap-2 text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-4 lg:text-left">
            {peerIds.map((peerId) =>
              peerId ? <RemotePeer key={peerId} peerId={peerId} /> : null
            )}
          </div>
        </div>
        {state === "connected" && <ChatBox />}
      </div>
    </main>
  );
}

import { GetServerSidePropsContext } from "next";

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const accessToken = new AccessToken({
    apiKey: process.env.NEXT_PUBLIC_API_KEY || "",
    roomId: ctx.params?.roomId?.toString() || "",
    role: Role.HOST,
    permissions: {
      admin: true,
      canConsume: true,
      canProduce: true,
      canProduceSources: {
        cam: true,
        mic: true,
        screen: true,
      },
      canRecvData: true,
      canSendData: true,
      canUpdateMetadata: true,
    },
  });

  const token = await accessToken.toJwt();

  return {
    props: { token },
  };
};
