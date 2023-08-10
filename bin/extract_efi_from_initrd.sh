#!/bin/sh
# set -x
#
# $Header: oss/image/InternalTools/extract_efi_from_initrd.sh /st_oss_pt-exaol8/2 2022/08/25 19:03:59 mnnk Exp $
#
# extractEfiFromInitrd.sh
#
# Copyright (c) 2018, 2022, Oracle and/or its affiliates. 
#
#    NAME
#      extractEfiFromInitrd.sh - <one-line expansion of the name>
#      ectractEfiFromInitrd .sh --initrd_file="" --extract_location=""
#
#    DESCRIPTION
#      This utility is to extract the shim.efi, shimx64.efi and grubx64.efi 
#      files from the initrd image. It will take two arguments as input:
#      - initrd file
#      - Location to extract
#      If either of the arguments are not passed, then we error out.
#      This utility is aimed to be used by oratst for imaging.
#
#    NOTES
#      1. Parse the inputs and get the initrd file and extraction location
#      2. Get the file-type of the initrd file.
#      3. Use cpio -idcv "*.efi" to get all the efi files and get the 
#         grubx64.efi and shimx64.efi files from /boot/efi/EFI/redhat
#      4. Copy them over to the required location
#      5. Cleanup.
#
#    MODIFIED   (MM/DD/YY)
#    muraghav    04/06/22 - Extract shimx64.efi on OL8 initrd images
#    muraghav    11/28/18 - update permissions on efi files
#    muraghav    11/14/18 - Creation
#

declare initrd_file=''
declare initrd_file_type=''
declare extract_location=''

# With OL8, we need grubx64.efi and shimx64.efi.
# In OL7 we get grubx64.efi, shim.efi. 
declare EFI_FILES="shimx64.efi grubx64.efi shim.efi"
declare OPTIONAL_EFI_FILES="shim.efi"


extractEfiFromInitrd_usage ()
{
cat << EOF
Usage:
$(basename $0) {[--initrd_file <INITRD_FILE> --extract_location <EXTRACT_PATH>] | [--help]}
$(basename $0) {[-i <INITRD_FILE> -e <EXTRACT_PATH>] | [-h]}



  Extracts the shimx64.efi and grubx64.efi files from the initrd file passed, 
  onto the location specified after --extract_location.

OPTIONS:
    -i|--initrd_file
        Absolute path of the Initrd file from which grubx64.efi, shim.efi 
        and shimx64.efi files are to be extracted
        

    -e|--extract_location
        Absolute path of the location to which the efi files are to be extracted

    -h
        Shows this screen

EOF
return 0
}


match_re ()
{
  # regular expression matching
  local string=$1
  local pattern=$2
  local mode=$3
  # Formal parameters
  #  $1 - string
  #  $2 - pattern
  #  $3 - nocasematch or casematch (default)

  # Preserve the current casematch option
  local preserve_casematch_opt=-u
  (shopt -q nocasematch) && preserve_casematch_opt=-s
  # Set proper case match option
  [ "$mode" == 'nocasematch' ] && shopt -s nocasematch || shopt -u nocasematch
  # Regex matching, no quotes!
  [[ $string =~ $pattern ]]
  local -i result=$?
  # Restore original option
  shopt $preserve_casematch_opt nocasematch
  return $result
}


extractEfiFromInitrd_getOptions ()
{
  if [ $# -eq 0 ]; then
    extractEfiFromInitrd_usage
    exit 1
  fi

  while [ $# -ge 1 ]; do
    case "$1" in
      # Help
      -h|--help)
        extractEfiFromInitrd_usage
        exit 0
        ;;
      # Initrd file to extract the efi files from
      -i|--initrd_file)
        if [ -s "$2" ]; then
          initrd_file="$2"
        else
          echo "[ERROR] Initrd file to extract the efi files from is not defined"
          exit 1
        fi
        shift
        ;;
        # Location to extract the efi files
      -e|--extract_location)
        if [ -d "$2" ]; then
          extract_location="$2"
        else
          echo "[ERROR] Location for extracting the files is not defined"
          exit 1
        fi
        shift
        ;;
      # Invalid option
      *)
        echo "[ERROR] Invalid option passed : $@"
        extractEfiFromInitrd_usage
        exit 1
        ;;
    esac
    shift
  done
  return 0
}


extractEfiFromInitrd_getInitrdFileType ()
{

  local -i ret_val=0
  initrd_file_type=''
  local initrd_compression=$(file $initrd_file)
  if [ $? -eq 0 ]; then
    if (match_re "$initrd_compression" 'gzip compressed data' 'nocasematch'); then
      initrd_file_type='gzip'
    elif (match_re "$initrd_compression" 'LZMA compressed data' 'nocasematch'); then
      initrd_file_type='lzma'
    elif (match_re "$initrd_compression" 'ASCII cpio archive' 'nocasematch'); then
      initrd_file_type='hybrid'
    else
      echo "[ERROR] Unknown file type of $initrd_file: $initrd_compression"
      ret_val=1
    fi
  else
    echo "[ERROR] Failed to get file type of initrd file: $initrd_file"
    ret_val=1
  fi
  return $ret_val
}


extractEfiFromInitrd_extractFiles ()
{

  local -i ret_val=0
  local file_not_found=""
  local extracted_files=""

  # We will not enter this if since we check for the directory in getOptions
  if [ ! -d "$extract_location" ]; then
    echo "[ERROR] Location to extract the EFI files does not exist"
    ret_val=1
  else
    pushd $extract_location 2>&1 >/dev/null
    rm -Rf temp_extract 2>&1
    mkdir temp_extract
    cd temp_extract
    
    # echo "File type: $initrd_file_type"
    # echo "zcat < $initrd_file | cpio -idcv "*.efi" 2>/dev/null"
    # echo "gunzip -c $initrd_file | cpio -idcv "*.efi" 2>/dev/null"
    case "$initrd_file_type" in
      gzip)
        # gunzip -c $initrd_file | cpio -idcv "*.efi" 2>/dev/null
        # For LINUX use -idcv | For MAC use -idmv
	      zcat < $initrd_file | cpio -idmv "*.efi" 2>/dev/null
        ;;
      lzma)
        xz -dc < $initrd_file | cpio -idmv "*.efi" 2>/dev/null
        ;;
      hybrid)
        (cpio -idv; zcat | cpio -idmv "*.efi") < $initrd_file 2>/dev/null
        ;;
    esac
    if [ $? -ne 0 ]; then
      echo "[ERROR] Failed to extract file $initrd_file"
      ret_val=1
    fi
    for efi_file in $EFI_FILES; do
      file_to_copy=$(find . -name "$efi_file")
      if [ -f "$file_to_copy" ]; then
        if [ -f ../$efi_file ]; then
          rm -f ../$efi_file
        fi
        cp -f "$file_to_copy" ../$efi_file
        if [ $? -ne 0 ]; then 
          echo "[ERROR] Failed to copy $file_to_copy to directory $extract_location"
          ret_val=1
        else
          # Enable read and execute permissions for all on the EFI file(s).
          chmod a+rx ../$efi_file
          extracted_files="$efi_file $extracted_files"
        fi
      else
        file_not_found="$file_to_copy $file_not_found"
      fi
    done
    for efi_file in $file_not_found; do
      if ! (match_re "$OPTIONAL_EFI_FILES" "$efi_file" 'nocasematch'); then
        echo "[ERROR] File not found : $efi_file"
        ret_val=1
      fi
    done
    cd ../
    rm -Rf temp_extract 2>/dev/null
    if [ ! -f shim.efi ] &&  [ -f shimx64.efi ]; then
      echo "[INFO] Created soft link shim.efi to shimx64.efi"
      ln -s shimx64.efi shim.efi
    fi
    echo "[INFO] Extracted $extracted_files from initrd file $initrd_file to $extract_location"
    # Cleanup the temporary directory
    popd 2>&1 >/dev/null
  fi
  return $ret_val
}


extractEfiFromInitrd_getOptions $@
extractEfiFromInitrd_getInitrdFileType
if [ $? -eq 0 ]; then
  extractEfiFromInitrd_extractFiles
  if [ $? -eq 0 ]; then
    exit 0
  fi
fi
# We have errored out to reach here. 
# Either the file type was not recognized, or all EFI files were not extracted.
echo "[ERROR] Failed to extract all the required EFI files: $EFI_FILES from the initrd file: $initrd_file"
exit 1
