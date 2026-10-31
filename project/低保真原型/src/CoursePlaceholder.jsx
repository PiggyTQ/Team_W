import React from 'react';
import {useLanguage} from './i18n/render';
export default function CoursePlaceholder({course}) {
  const en=useLanguage()==='en';
  return <section data-i18n="off" className="course-placeholder">
    <p className="notice">{en?'Course materials are being collected. This outline is a placeholder; reading and video playback are not available yet.':'课程资料正在收集中。当前只保留目录占位，尚未开放正文阅读、视频播放与课程完成记录。'}</p>
    <h3>{en?'Chapter outline':'章节目录'}</h3>
    <ol>{(course?.chapters||[]).map(chapter=><li key={chapter.id}><span>{chapter.title}</span> · <small>{en?'Content pending':'内容待补充'}</small></li>)}</ol>
    <h3>{en?'Video':'视频'}</h3>
    <p>{en?'Video material pending. No source or duration has been supplied.':'视频资料待补充，播放地址与时长尚未提供。'}</p>
    {!course&&<p role="status">{en?'The course directory is temporarily unavailable. Please retry later.':'课程目录暂未读取到，请稍后重试。'}</p>}
  </section>;
}
