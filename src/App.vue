<script setup>
import {io, Socket} from "socket.io-client"
import {onMounted, ref} from "vue"

const localVideoRef = ref(null)
const caller = ref(false) //是否是发起人
const called = ref(false) //是否是接受方
const calling = ref(false) //状态
const localStream = ref();
const removeVideoRef = ref(null);
const lightalk = ref(false)
const connect = ref(false)
const peer = ref()
const sock = io('http://192.168.2.4:3000');
let roomId = 1


//获取本地视频流
const getLocalStream = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: true,
  })
  localVideoRef.value.srcObject = stream

  localVideoRef.value.play()
  localStream.value = stream
  return stream
}
onMounted(() => {

  sock.on("connectionSuccess", (socket) => {
    console.log("链接成功")
  })
  sock.emit('joinRoom', roomId)

  //被呼叫
  sock.on('callRemote', () => {
    if (!caller.value) {
      console.log('有人打电话')
      calling.value = true
      called.value = true
      lightalk.value = true
    }
  })

  //对方同意接受视频
  sock.on('acceptCall', async () => {
    if (caller.value) {
      calling.value = false
      console.log('对方同意')
      peer.value = new RTCPeerConnection()
      localStream.value.getTracks().forEach(track => {
        peer.value.addTrack(track, localStream.value)
      })
      peer.value.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("A触发", peer.value)
          sock.emit('sendCandidate', {candidate: event.candidate})
        }

      }
      peer.onaddstream = (event) => {
        console.log("求求了")
      }
      peer.value.ontrack = async ({streams: [stream]}) => {
        removeVideoRef.value.srcObject = stream

        removeVideoRef.value.play()

        connect.value = true
      }
      let offer = await peer.value.createOffer({
        offerToReceiveAudio: 1,
        offerToReceiveVideo: 1,
      })
      await peer.value.setLocalDescription(offer)
      console.log('offer', offer)
      sock.emit('sendOffer', {offer, roomId})
    }

  })
  sock.on('sendOffer', async (offer) => {
    if (called.value) {
      console.log("收到offer", offer)
      peer.value = new RTCPeerConnection()
      const stream = await getLocalStream()
      stream.getTracks().forEach(track => {
        // console.log(track, 'track')
        peer.value.addTrack(track, stream)
      })
      peer.value.onicecandidate = (event) => {

        if (event.candidate) {
          console.log("B触发", event.candidate)
          sock.emit('sendCandidate', {candidate: event.candidate})
        }
      }
      peer.value.ontrack = ({streams: [stream]}) => {
        console.log("用户B收到", stream)
        removeVideoRef.value.srcObject = stream
        // console.log(removeVideoRef.value)
        removeVideoRef.value.play()
        connect.value = true
      }
      await peer.value.setRemoteDescription(offer)

      const answer = await peer.value.createAnswer();
      await peer.value.setLocalDescription(answer)


      // 发送answer给服务器
      sock.emit('sendAnswer', {answer, roomId})


    }
  })

  // 发起人收到answer
  sock.on('sendAnswer', async (answer) => {
    if (caller.value) {
      console.log("发起人收到回复", answer)
      await peer.value.setRemoteDescription(answer)
    }
  })


  sock.on('sendCandidate', (candidate) => {

    if (candidate) {
      console.log('收到Candidate', candidate)
      peer.value.addIceCandidate(candidate)
    }

  })

})
const handleOptionCall = () => {
  getLocalStream()
  calling.value = true
  caller.value = true
  sock.emit('call', roomId)

}
const handleOptionAccept = () => {
  //同意接听
  sock.emit('acceptCall', roomId)
  lightalk.value = false
}
</script>

<template>

  <div class="flex items-center justify-center h-screen flex-col">
    <video ref="removeVideoRef" class="w-[200px] h-[200px] bg-black"></video>
    <div class="w-[400px] h-[600px] bg-red-100 relative">
      <video ref="localVideoRef" class="w-full h-full bg-black"></video>
      <div v-if="caller" class="absolute top-0 left-0 w-full h-full  z-10 text-red-500 flex justify-center items-end">
        <div class="mb-10" v-if="caller && calling">
          等待接听
        </div>
      </div>

      <div v-if="lightalk"
           class="bg-black absolute top-0 left-0 w-full h-full  z-10 text-red-500 flex justify-center items-end">
        <div class="mb-10">
          有人打电话
        </div>
      </div>
    </div>
    <div class="flex items-center">
      <div @click="handleOptionCall" class="bg-green-500 rounded-xl p-2 mt-3 mr-10">
        发起视频
      </div>
      <div @click="handleOptionAccept" class="bg-green-500 rounded-xl p-2 mt-3 ">接受视频</div>
    </div>
  </div>
</template>

<style scoped>

</style>
